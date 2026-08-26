// The browser half of the sealed channel.
//
// Every /api/v1 call is signed with a key agreed with the server over ECDH and,
// where it has a body, encrypted with it. The server refuses anything that is
// not, which is what makes a hand-rolled request from a REST client fail: there
// is no key to sign with until the handshake has been completed by code running
// on the page.
//
// Worth being straight about the limit: this raises the bar a long way, but the
// page's own JavaScript is delivered to the client, so someone determined enough
// to drive a headless browser can always obtain a channel. It is a wall, not a
// proof of identity — every authorisation decision still happens server-side.

const HANDSHAKE_PATH = "/api/v1/secure/handshake";

export type Sealed = { iv: string; ct: string };

type Channel = {
  sessionId: string;
  key: CryptoKey;
  signingKey: CryptoKey;
  expiresAt: number;
};

let channel: Channel | null = null;
let opening: Promise<Channel> | null = null;

function b64url(bytes: ArrayBuffer | Uint8Array): string {
  const view = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let binary = "";
  for (const byte of view) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromB64url(value: string): Uint8Array {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(padded);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
  return out;
}

function subtle(): SubtleCrypto {
  const crypto = globalThis.crypto;
  if (!crypto?.subtle) {
    // Only served over a secure context (https, or localhost). Saying so beats
    // failing later with something cryptic about an undefined property.
    throw new Error(
      "This browser cannot open a secure channel. The portal must be served over HTTPS or from localhost.",
    );
  }
  return crypto.subtle;
}

async function hex(data: Uint8Array): Promise<string> {
  const digest = await subtle().digest("SHA-256", data as BufferSource);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * HKDF-SHA256 over the ECDH secret, salted with the channel id — the same
 * derivation the server performs, so both ends land on the same key.
 */
async function deriveKeys(shared: CryptoKey, peer: CryptoKey, sessionId: string) {
  const bits = await subtle().deriveBits({ name: "ECDH", public: peer }, shared, 256);
  const master = await subtle().importKey("raw", bits, "HKDF", false, ["deriveKey"]);
  const params = {
    name: "HKDF",
    hash: "SHA-256",
    salt: fromB64url(sessionId) as BufferSource,
    info: new TextEncoder().encode("zemen-paylink-secure-channel-v1") as BufferSource,
  } as const;

  const raw = await subtle().deriveKey(params, master, { name: "AES-GCM", length: 256 }, true, [
    "encrypt",
    "decrypt",
  ]);
  // The same 32 bytes serve as the AES key and the HMAC key; exporting once
  // keeps the two ends in step without a second derivation step to get wrong.
  const bytes = await subtle().exportKey("raw", raw);
  const key = await subtle().importKey("raw", bytes, { name: "AES-GCM" }, false, [
    "encrypt",
    "decrypt",
  ]);
  const signingKey = await subtle().importKey(
    "raw",
    bytes,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return { key, signingKey };
}

async function openChannel(base: string): Promise<Channel> {
  const pair = (await subtle().generateKey({ name: "ECDH", namedCurve: "P-256" }, false, [
    "deriveBits",
    "deriveKey",
  ])) as CryptoKeyPair;

  const publicKey = b64url(await subtle().exportKey("raw", pair.publicKey));

  const response = await fetch(base + HANDSHAKE_PATH, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ publicKey }),
  });
  if (!response.ok) throw new Error("Could not open a secure channel with the PayLink service.");

  const body: { sessionId: string; publicKey: string; expiresIn: number } = await response.json();
  const peer = await subtle().importKey(
    "raw",
    fromB64url(body.publicKey) as BufferSource,
    { name: "ECDH", namedCurve: "P-256" },
    false,
    [],
  );
  const { key, signingKey } = await deriveKeys(pair.privateKey, peer, body.sessionId);

  return {
    sessionId: body.sessionId,
    key,
    signingKey,
    // Renewed a minute early so a call never lands on a channel that has just
    // aged out between the check and the request.
    expiresAt: Date.now() + Math.max(0, body.expiresIn - 60) * 1000,
  };
}

/** Returns a live channel, opening one if needed. Concurrent callers share it. */
export async function ensureChannel(base: string, force = false): Promise<Channel> {
  if (force) channel = null;
  if (channel && Date.now() < channel.expiresAt) return channel;
  if (!opening) {
    opening = openChannel(base)
      .then((c) => {
        channel = c;
        return c;
      })
      .finally(() => {
        opening = null;
      });
  }
  return opening;
}

/** Drops the current channel, so the next call re-handshakes. */
export function resetChannel() {
  channel = null;
}

export type SealedRequest = {
  headers: Record<string, string>;
  body?: string;
};

/**
 * Seals one request: encrypts the body if there is one, then signs the method,
 * the full path, the timestamp, the nonce and a hash of what is being sent.
 *
 * Signing the path and body hash is what stops a captured request being
 * replayed against a different endpoint or with different numbers in it.
 */
export async function sealRequest(
  base: string,
  method: string,
  path: string,
  payload: unknown,
): Promise<SealedRequest> {
  const active = await ensureChannel(base);
  const nonceBytes = crypto.getRandomValues(new Uint8Array(16));
  const nonce = b64url(nonceBytes);
  const ts = String(Date.now());

  let body: string | undefined;
  if (payload !== undefined) {
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const plaintext = new TextEncoder().encode(JSON.stringify(payload));
    const ct = await subtle().encrypt(
      {
        name: "AES-GCM",
        iv: iv as BufferSource,
        additionalData: new TextEncoder().encode(`${active.sessionId}|${nonce}`) as BufferSource,
      },
      active.key,
      plaintext as BufferSource,
    );
    body = JSON.stringify({ iv: b64url(iv), ct: b64url(ct) } satisfies Sealed);
  }

  const bodyHash = await hex(new TextEncoder().encode(body ?? ""));
  const signature = await subtle().sign(
    "HMAC",
    active.signingKey,
    new TextEncoder().encode(
      `${method}\n${path}\n${ts}\n${nonce}\n${bodyHash}`,
    ) as BufferSource,
  );

  const headers: Record<string, string> = {
    "X-PL-Session": active.sessionId,
    "X-PL-TS": ts,
    "X-PL-Nonce": nonce,
    "X-PL-Sig": b64url(signature),
  };
  if (body !== undefined) headers["Content-Type"] = "application/json";
  return { headers, body };
}

/** Opens a sealed response, using the nonce the request was signed with. */
export async function openResponse(text: string, nonce: string): Promise<string> {
  const active = channel;
  if (!active) throw new Error("No secure channel is open.");
  const env = JSON.parse(text) as Sealed;
  const plain = await subtle().decrypt(
    {
      name: "AES-GCM",
      iv: fromB64url(env.iv) as BufferSource,
      additionalData: new TextEncoder().encode(`${active.sessionId}|${nonce}`) as BufferSource,
    },
    active.key,
    fromB64url(env.ct) as BufferSource,
  );
  return new TextDecoder().decode(plain);
}
