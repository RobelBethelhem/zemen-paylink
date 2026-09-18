"use client";

import { useState, type ReactNode } from "react";
import { s } from "@/lib/css";
import { useApp } from "@/store/AppProvider";

const card =
  "background:#fff;border:1px solid #ECECEE;border-radius:15px;box-shadow:0 1px 2px rgba(20,21,25,.04)";

function Code({ children }: { children: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(children);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };
  return (
    <div style={s("position:relative;margin:12px 0")}>
      <button
        onClick={copy}
        style={s("position:absolute;top:10px;right:10px;padding:5px 10px;border:1px solid rgba(255,255,255,.18);background:rgba(255,255,255,.06);color:#C6C7CD;border-radius:7px;font-size:11.5px;font-weight:600;cursor:pointer;font-family:inherit;z-index:1")}
      >
        {copied ? "Copied" : "Copy"}
      </button>
      <pre style={s("margin:0;padding:16px 18px;background:#141519;color:#E6E7EA;border-radius:12px;overflow-x:auto;font-family:'IBM Plex Mono';font-size:12.5px;line-height:1.65")}>
        {children}
      </pre>
    </div>
  );
}

function Section({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section id={id} style={s("margin-bottom:34px;scroll-margin-top:20px")}>
      <h2 style={s("font-family:'Space Grotesk';font-weight:600;font-size:18px;margin:0 0 10px;letter-spacing:-.01em")}>
        {title}
      </h2>
      <div style={s("font-size:13.5px;line-height:1.7;color:#3A3B42")}>{children}</div>
    </section>
  );
}

function P({ children }: { children: ReactNode }) {
  return <p style={s("margin:0 0 12px")}>{children}</p>;
}

function Table({ rows }: { rows: Array<[string, string]> }) {
  return (
    <div style={s("border:1px solid #ECECEE;border-radius:11px;overflow:hidden;margin:12px 0")}>
      {rows.map(([left, right], i) => (
        <div
          key={left}
          style={s(`display:grid;grid-template-columns:minmax(130px,0.9fr) 2fr;gap:14px;padding:10px 14px;font-size:13px;${i > 0 ? "border-top:1px solid #F2F2F4" : ""}`)}
        >
          <code style={s("font-family:'IBM Plex Mono';font-size:12.5px;color:#B0141C;word-break:break-word")}>
            {left}
          </code>
          <span style={s("color:#3A3B42;line-height:1.6")}>{right}</span>
        </div>
      ))}
    </div>
  );
}

const SECTIONS: Array<[string, string]> = [
  ["start", "How it works"],
  ["credentials", "Your credentials"],
  ["signing", "Signing a request"],
  ["sealing", "Sealing the body"],
  ["client", "A working client"],
  ["create", "Creating a link"],
  ["returning", "Returning the payer"],
  ["metadata", "Metadata"],
  ["webhooks", "Webhooks"],
  ["errors", "When it is refused"],
  ["live", "Going live"],
];

export function DeveloperDocs() {
  const { on, origin } = useApp();
  const base = origin || "https://paylink.zemenbank.et";

  return (
    <div data-pad="" style={s("padding:26px 30px;max-width:1180px;margin:0 auto;animation:fadeUp .45s ease both")}>
      <div style={s("display:flex;align-items:flex-start;gap:16px;margin-bottom:22px")}>
        <div style={s("flex:1;min-width:0")}>
          <div style={s("font-family:'Space Grotesk';font-weight:600;font-size:21px;letter-spacing:-.01em")}>
            Developer documentation
          </div>
          <div style={s("color:#6B6D76;font-size:13.5px;margin-top:5px;line-height:1.6;max-width:70ch")}>
            Everything a system needs to create payment links through the API: ask
            for a link, put its URL in front of your payer, and be told what
            happened to the money.
          </div>
        </div>
        <button
          onClick={on.integrations}
          style={s("padding:10px 16px;border:1px solid #E7E7EA;background:#fff;border-radius:10px;font-size:13px;font-weight:600;color:#3A3B42;cursor:pointer;font-family:inherit;white-space:nowrap")}
        >
          My credentials
        </button>
      </div>

      <div data-grid-2="" style={s("display:grid;grid-template-columns:200px 1fr;gap:22px;align-items:start")}>
        <nav
          data-hide-mobile=""
          style={s(`${card};padding:14px 10px;position:sticky;top:20px`)}
        >
          {SECTIONS.map(([id, title]) => (
            <a
              key={id}
              href={`#${id}`}
              style={s("display:block;padding:8px 12px;border-radius:8px;font-size:13px;color:#5B5D66;text-decoration:none;font-weight:500")}
            >
              {title}
            </a>
          ))}
        </nav>

        <div style={s(`${card};padding:28px 32px`)}>
          <Section id="start" title="How it works">
            <P>
              Three calls make an integration. You ask for a payment link, you send
              your payer to the URL it returns, and we tell you what happened —
              by webhook, or by asking.
            </P>
            <P>
              Every call is signed and encrypted. There is no simpler mode, and that
              is the point: it means a caller has to hold your secret, not merely
              have seen a request go past.
            </P>
            <Table
              rows={[
                [`POST ${base}/api/v1/integration/links`, "Create a payment link."],
                [`GET  .../integration/payments/{orderId}`, "What happened to a payment."],
                [`GET  .../integration/links/{id}`, "A link and what has been paid against it."],
                [`GET  .../integration/ping`, "Prove your credentials, signing and encryption work."],
              ]}
            />
          </Section>

          <Section id="credentials" title="Your credentials">
            <P>
              Three values, issued once on the Integrations screen. Two of them are
              never shown again — they are stored sealed, and not even the bank can
              read them back. Lose them and you rotate.
            </P>
            <Table
              rows={[
                ["API key", "Identifies you. Safe to log. pk_test_… or pk_live_…"],
                ["Secret key", "Signs every request. Never send it."],
                ["Encryption key", "Seals request and response bodies. 32 bytes, base64."],
              ]}
            />
            <P>
              The prefix tells you which gateway a key works against. <code>pk_test_</code>{" "}
              never moves real money; <code>pk_live_</code> always does. They are
              separate credentials against separate gateways, and a test key never
              becomes a live one.
            </P>
          </Section>

          <Section id="signing" title="Signing a request">
            <P>Four headers on every call:</P>
            <Code>{`X-PL-Key:   pk_test_9f2c…
X-PL-TS:    1757000000000     ← milliseconds since the epoch
X-PL-Nonce: 3f9a7c1e-…        ← unique per request
X-PL-Sig:   Yk3f…             ← base64url, unpadded`}</Code>
            <P>
              The signature is HMAC-SHA256 with your <strong>secret key</strong>, over
              five lines joined by a newline:
            </P>
            <Code>{`METHOD
/full/request/uri?including=query
TIMESTAMP
NONCE
hex(sha256(raw request body))`}</Code>
            <P>
              Signed over the body <strong>as it goes on the wire</strong> — the sealed
              bytes, not your plaintext. That is the only thing both sides can agree
              on, and signing the plaintext instead is the single most common mistake.
            </P>
          </Section>

          <Section id="sealing" title="Sealing the body">
            <P>
              AES-256-GCM with your encryption key. The additional authenticated data
              is your API key and the nonce, joined with a pipe:
            </P>
            <Code>{`aad = apiKey + "|" + nonce`}</Code>
            <P>Send the envelope:</P>
            <Code>{`{ "iv": "<base64url of the 12-byte IV>",
  "ct": "<base64url of ciphertext + tag>" }`}</Code>
            <P>
              Responses come back the same way, sealed with the same key and the same
              AAD — so you write <code>open()</code> once and use it in both
              directions. A GET has no body: sign over empty bytes and send none.
            </P>
          </Section>

          <Section id="client" title="A working client">
            <P>Node, no dependencies. This is the whole of it.</P>
            <Code>{`import crypto from "node:crypto";

const BASE = "${base}";
const API_KEY = process.env.PAYLINK_KEY;
const SECRET  = process.env.PAYLINK_SECRET;
const ENC_KEY = Buffer.from(process.env.PAYLINK_ENC_KEY, "base64");

const b64url = (b) => Buffer.from(b).toString("base64url");

function seal(plaintext, nonce) {
  const iv = crypto.randomBytes(12);
  const c = crypto.createCipheriv("aes-256-gcm", ENC_KEY, iv);
  c.setAAD(Buffer.from(\`\${API_KEY}|\${nonce}\`));
  const ct = Buffer.concat([c.update(plaintext, "utf8"), c.final(), c.getAuthTag()]);
  return { iv: b64url(iv), ct: b64url(ct) };
}

function open(envelope, nonce) {
  const raw = Buffer.from(envelope.ct, "base64url");
  const tag = raw.subarray(raw.length - 16);
  const d = crypto.createDecipheriv("aes-256-gcm", ENC_KEY,
    Buffer.from(envelope.iv, "base64url"));
  d.setAAD(Buffer.from(\`\${API_KEY}|\${nonce}\`));
  d.setAuthTag(tag);
  return JSON.parse(d.update(raw.subarray(0, raw.length - 16)) + d.final("utf8"));
}

export async function call(method, path, payload) {
  const nonce = crypto.randomUUID();
  const ts = String(Date.now());
  const body = payload ? JSON.stringify(seal(JSON.stringify(payload), nonce)) : "";

  const digest = crypto.createHash("sha256").update(body).digest("hex");
  const sig = crypto.createHmac("sha256", SECRET)
    .update([method, path, ts, nonce, digest].join("\\n"))
    .digest("base64url");

  const res = await fetch(BASE + path, {
    method,
    headers: {
      "Content-Type": "application/json",
      "X-PL-Key": API_KEY,
      "X-PL-TS": ts,
      "X-PL-Nonce": nonce,
      "X-PL-Sig": sig,
    },
    body: body || undefined,
  });

  const text = await res.text();
  if (!text) return null;
  const parsed = JSON.parse(text);
  return res.headers.get("X-PL-Sealed") ? open(parsed, nonce) : parsed;
}`}</Code>
            <P>
              <strong>Check it works before writing anything else.</strong> Every
              integration goes wrong here first, and it should be cheap to find out.
            </P>
            <Code>{`await call("GET", "/api/v1/integration/ping");
// { ok: true, integration: "Z-Care", environment: "test", … }`}</Code>
          </Section>

          <Section id="create" title="Creating a link">
            <Code>{`const link = await call("POST", "/api/v1/integration/links", {
  title:      "Donation — Clean Water Appeal",
  reference:  "ZC-2026-0912",
  type:       "static",
  amount:     "500.00",
  currency:   "USD",
  maxUses:    1,
  expiresAt:  "2026-10-01T00:00:00Z",
  successUrl: "https://z-care.et/thanks/clean-water",
  failureUrl: "https://z-care.et/retry/clean-water",
  metadata: { campaign: "clean-water", donorId: "9931" },
});

// link.url → send your payer here`}</Code>
            <Table
              rows={[
                ["title", "Required. What the payer sees they are paying for."],
                ["type", "static (fixed amount) or dynamic (payer chooses). Default static."],
                ["amount", 'Required for static. A decimal string — "500.00", never a float.'],
                ["min / max", "Optional bounds for a dynamic link."],
                ["paymentMode", "purchase takes the money; authorize only reserves it."],
                ["maxUses", "How many times it may be paid. Omit for unlimited."],
                ["expiresAt", "RFC3339, and must be in the future."],
                ["successUrl / failureUrl", "Where this payer returns. Per link, so each campaign can differ."],
                ["metadata", "Up to 20 key/value pairs, returned with every payment."],
              ]}
            />
          </Section>

          <Section id="returning" title="Returning the payer to you">
            <P>
              Set <code>successUrl</code> and <code>failureUrl</code> and we hand the
              payer back to you once the outcome is settled.
            </P>
            <P>
              Mastercard returns them to our confirmation page, which states what
              happened to their money, waits about two and a half seconds, then sends
              them on. The link is on screen throughout, so a blocked or slow redirect
              strands nobody.
            </P>
            <P>The order id is appended, so your page knows which payment it is for:</P>
            <Code>{`https://z-care.et/thanks/clean-water?order=PL-4611-ZunsGsqW`}</Code>
            <P>Any query string you already put on the URL is kept.</P>
            <Table
              rows={[
                ["successUrl", "paid, partially captured, authorized, refunded"],
                ["failureUrl", "failed, cancelled, expired"],
                ["neither", "while the payment is still in flight — nobody is redirected until the result is known"],
              ]}
            />
            <P>
              Set them per link when you create it, or set defaults on the Integrations
              screen and leave them off the request — a link&rsquo;s own values win.
            </P>
            <P>
              <strong>The redirect is not proof of payment.</strong> A payer can close
              the tab, lose signal, or never arrive. Treat it as navigation, and take
              the webhook or a direct lookup as the truth about the money.
            </P>
          </Section>

          <Section id="metadata" title="Metadata">
            <P>
              Whatever you attach comes back on every payment and every webhook for
              that link. It is how you answer “which campaign was this donation for”
              without keeping your own map from our link ids to your records.
            </P>
            <P>
              Stored as indexed rows rather than a blob, because the question actually
              asked is “every payment for campaign X” — and that stays a lookup as
              your history grows rather than becoming a scan.
            </P>
            <P>
              Keys up to 64 characters, values up to 512, twenty pairs per link.
            </P>
          </Section>

          <Section id="webhooks" title="Webhooks">
            <P>
              Configure one URL on the Integrations screen. We POST to it when a
              payment resolves, and keep trying if you are not there — 30 seconds,
              2 minutes, 10 minutes, 1 hour, 6 hours, 24 hours, then we give up and
              keep the record.
            </P>
            <Code>{`X-PL-Event:     payment.succeeded
X-PL-Delivery:  WH-7f2a…
X-PL-TS:        1757000000000
X-PL-Signature: <base64url>`}</Code>
            <P>
              The body is the same sealed envelope, but with the{" "}
              <strong>delivery id</strong> as the nonce half of the AAD:
            </P>
            <Code>{`aad = apiKey + "|" + deliveryId   // the X-PL-Delivery header

const expected = crypto.createHmac("sha256", SECRET)
  .update(\`\${tsHeader}\\n\${crypto.createHash("sha256").update(rawBody).digest("hex")}\`)
  .digest("base64url");
// compare with X-PL-Signature in constant time, then open the body`}</Code>
            <P>Opened, it reads:</P>
            <Code>{`{
  "event": "payment.succeeded",
  "createdAt": "2026-09-15T08:20:31Z",
  "data": {
    "orderId": "PL-4611-ZunsGsqW",
    "linkId": "PL-4611",
    "status": "paid",
    "amount": "500.00",
    "amountMinor": 50000,
    "currency": "USD",
    "cardBrand": "MASTERCARD",
    "cardLast4": "5567",
    "metadata": { "campaign": "clean-water", "donorId": "9931" }
  }
}`}</Code>
            <Table
              rows={[
                ["payment.succeeded", "The money was taken."],
                ["payment.authorized", "Funds reserved, not yet captured."],
                ["payment.failed", "The attempt did not succeed."],
                ["payment.refunded", "Money went back, in full or in part."],
              ]}
            />
            <P>
              <strong>Answer 2xx to accept.</strong> Be idempotent — key on{" "}
              <code>orderId</code> and <code>event</code>. We will not deliberately
              send the same pair twice, but a delivery you answered slowly may still
              arrive again.
            </P>
            <P>
              <strong>Use the lookup as well as the webhook.</strong> A payer&rsquo;s
              redirect can be lost to a closed tab or a train tunnel; a webhook
              depends on your server being up. Asking directly depends on neither. A
              payment that succeeded at the gateway and was never recorded by you is
              the failure worth designing against.
            </P>
          </Section>

          <Section id="errors" title="When it is refused">
            <Table
              rows={[
                ["credentials_required", "A header is missing."],
                ["credentials_invalid", "We do not know that API key."],
                ["integration_suspended", "The key is real; access was withdrawn."],
                ["signature_invalid", "The HMAC did not match. Did you sign the sealed body?"],
                ["timestamp_invalid", "Your clock is more than two minutes out. Fix NTP."],
                ["replayed", "That nonce was already used. One per request."],
                ["payload_invalid", "The body could not be opened. Usually the wrong AAD."],
                ["gateway_required", "No verified gateway for this environment yet."],
              ]}
            />
            <P>
              <strong>The three that catch everyone.</strong>{" "}
              <code>signature_invalid</code> is nearly always signing the plaintext
              instead of the sealed bytes. <code>payload_invalid</code> is nearly
              always the AAD — <code>apiKey|nonce</code> for calls,{" "}
              <code>apiKey|deliveryId</code> for webhooks.{" "}
              <code>timestamp_invalid</code> is your server clock: two minutes either
              way is the whole budget, and it is what stops a captured request being
              replayed tomorrow.
            </P>
          </Section>

          <Section id="live" title="Going live">
            <P>
              Live credentials are not requested and granted. They are the outcome of
              a review.
            </P>
            <P>
              Build against your test key and take real test payments. Connect the
              live MPGS gateway. Then ask to go live from the Integrations screen — a
              bank administrator looks at the merchant and at what your test traffic
              actually did. Asking with no test payments is refused, because there
              would be nothing to review.
            </P>
            <P>
              On approval a <strong>separate</strong> live integration is created,
              with its own key, secret and encryption key. Your test one keeps
              working, and you will want it.
            </P>
            <Table
              rows={[
                ["600 / minute", "Calls per API key."],
                ["256 KB", "Largest request body."],
                ["2 minutes", "Clock skew allowed either way."],
              ]}
            />
          </Section>
        </div>
      </div>
    </div>
  );
}
