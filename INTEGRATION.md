# Zemen PayLink — integration guide

For a system that wants to take card payments through PayLink without anyone
opening the portal: a fundraising platform, a billing system, an ERP.

You ask for a payment link, put its URL in front of your payer, and we tell you
what happened to the money.

---

## What you are given

Three values, once, when your integration is created. Two of them are never
shown again.

| Value | What it is for |
|---|---|
| **API key** — `pk_test_…` / `pk_live_…` | Identifies you. Safe to log. |
| **Secret key** | Signs your requests. Proves the call is really yours. |
| **Encryption key** | Seals request and response bodies. 32 bytes, base64. |

The prefix tells you which gateway a key works against. `pk_test_` never moves
real money; `pk_live_` always does. They are separate credentials against
separate gateways, and a test key does not become a live one.

**Copy all three when they are issued.** The secret and encryption keys are
stored sealed and cannot be read back — not by you, not by the bank. If they
are lost, rotate to issue a new set.

---

## Every request

Four headers and a sealed body. There is no "simple mode": an unsigned or
unsealed call is refused, which is what makes holding the key — rather than
having once seen a URL — the thing that matters.

```
POST /api/v1/integration/links
Content-Type: application/json

X-PL-Key:   pk_test_9f2c…
X-PL-TS:    1757000000000          ← milliseconds since the epoch
X-PL-Nonce: 3f9a7c1e-…             ← unique per request, any string up to 128 chars
X-PL-Sig:   Yk3f…                  ← base64url, unpadded
```

### The signature

HMAC-SHA256 with your **secret key**, over five lines joined by `\n`:

```
METHOD
/full/request/uri?including=query
TIMESTAMP
NONCE
hex(sha256(raw request body))
```

Signed over the body **as it goes on the wire** — that is, the sealed bytes,
not the plaintext. That is the only thing both sides can agree on.

Encode the result with base64url, no padding.

### The body

Encrypt your JSON with **AES-256-GCM** using the encryption key. Additional
authenticated data is your API key and the nonce joined with `|`:

```
aad = apiKey + "|" + nonce
```

Send the envelope:

```json
{ "iv": "<base64url of the 12-byte IV>", "ct": "<base64url of ciphertext+tag>" }
```

Responses come back in the same envelope, sealed with the same key and the same
AAD. One `open()` serves both directions.

A request with no body (a `GET`) is signed over empty bytes and sent with no
body at all.

### Worked example — Node.js

```js
import crypto from "node:crypto";

const BASE = "https://paylink.zemenbank.et";
const API_KEY = process.env.PAYLINK_KEY;
const SECRET = process.env.PAYLINK_SECRET;
const ENC_KEY = Buffer.from(process.env.PAYLINK_ENC_KEY, "base64"); // 32 bytes

const b64url = (b) => Buffer.from(b).toString("base64url");

function seal(plaintext, nonce) {
  const iv = crypto.randomBytes(12);
  const c = crypto.createCipheriv("aes-256-gcm", ENC_KEY, iv);
  c.setAAD(Buffer.from(`${API_KEY}|${nonce}`));
  const ct = Buffer.concat([c.update(plaintext, "utf8"), c.final(), c.getAuthTag()]);
  return { iv: b64url(iv), ct: b64url(ct) };
}

function open(envelope, nonce) {
  const raw = Buffer.from(envelope.ct, "base64url");
  const tag = raw.subarray(raw.length - 16);
  const d = crypto.createDecipheriv("aes-256-gcm", ENC_KEY, Buffer.from(envelope.iv, "base64url"));
  d.setAAD(Buffer.from(`${API_KEY}|${nonce}`));
  d.setAuthTag(tag);
  return JSON.parse(d.update(raw.subarray(0, raw.length - 16)) + d.final("utf8"));
}

export async function call(method, path, payload) {
  const nonce = crypto.randomUUID();
  const ts = String(Date.now());
  const body = payload ? JSON.stringify(seal(JSON.stringify(payload), nonce)) : "";

  const digest = crypto.createHash("sha256").update(body).digest("hex");
  const sig = crypto.createHmac("sha256", SECRET)
    .update([method, path, ts, nonce, digest].join("\n"))
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
  // An error before the channel opens is plain JSON; everything after is sealed.
  return res.headers.get("X-PL-Sealed") ? open(parsed, nonce) : parsed;
}
```

### Check it works before writing anything else

```js
await call("GET", "/api/v1/integration/ping");
// { ok: true, integration: "Z-Care", environment: "test", … }
```

Every integration goes wrong here first. Getting a clean `ping` means your key,
your signature and your encryption are all correct, and everything after is
just fields.

---

## Creating a payment link

```
POST /api/v1/integration/links
```

```json
{
  "title": "Donation — Clean Water Appeal",
  "reference": "ZC-2026-0912",
  "type": "static",
  "amount": "500.00",
  "currency": "USD",
  "maxUses": 1,
  "expiresAt": "2026-10-01T00:00:00Z",
  "successUrl": "https://z-care.et/thanks/clean-water",
  "failureUrl": "https://z-care.et/retry/clean-water",
  "metadata": {
    "campaign": "clean-water",
    "donorId": "9931",
    "appeal": "2026-Q4"
  }
}
```

| Field | Notes |
|---|---|
| `title` | **Required.** What the payer sees they are paying for. |
| `type` | `static` (fixed amount) or `dynamic` (payer chooses). Default `static`. |
| `amount` | Required for `static`. A decimal string — `"500.00"`, never a float. |
| `min` / `max` | Optional bounds for `dynamic`. |
| `paymentMode` | `purchase` takes the money; `authorize` only reserves it. |
| `maxUses` | How many times it may be paid. Omit for unlimited. |
| `expiresAt` | RFC3339. Must be in the future. |
| `successUrl` / `failureUrl` | Where this payer returns. Per link, so each campaign can have its own. |
| `metadata` | Up to 20 key/value pairs. Returned with every payment. |

Returns **201** with the link:

```json
{
  "id": "PL-4611",
  "slug": "Qm71xB",
  "url": "https://paylink.zemenbank.et/l/Qm71xB",
  "environment": "test",
  "amount": "500.00",
  "currency": "USD",
  "status": "active",
  "metadata": { "campaign": "clean-water", "donorId": "9931", "appeal": "2026-Q4" },
  "createdAt": "2026-09-15T08:12:04Z"
}
```

Send the payer to `url`. That is the whole of it.

### Returning the payer to you

Set `successUrl` and `failureUrl` and we hand the payer back to you once the
outcome is settled.

What they see: Mastercard returns them to our confirmation page, which states
what happened to their money, waits about two and a half seconds, and then
sends them to your address. The link is on screen the whole time, so a blocked
or slow redirect leaves nobody stranded.

The order id is appended, so your page knows which payment it is being shown
for:

```
https://z-care.et/thanks/clean-water?order=PL-4611-ZunsGsqW
```

Any query string you already put on the URL is kept.

Which address is used is decided by us, from the payment:

| Outcome | Sent to |
|---|---|
| paid, partially captured, authorized, refunded | `successUrl` |
| failed, cancelled, expired | `failureUrl` |
| still in flight | neither — nobody is redirected until the result is known |

Set these per link when you create it, or set defaults on the Integrations
screen and leave them off the request. A link's own values win.

**The redirect is not proof of payment.** A payer can close the tab, lose
signal, or simply not arrive. Treat it as navigation, and take the webhook or a
direct lookup as the truth about the money.

### Metadata is the part worth getting right

Whatever you put in `metadata` comes back on every payment and every webhook for
that link. It is how you answer "which campaign was this donation for" without
keeping your own map from our link ids to your records.

Stored as indexed rows rather than a blob, so "every payment for campaign X"
stays a lookup as your history grows.

Keys up to 64 characters, values up to 512, twenty pairs per link.

---

## Finding out what happened

Two mechanisms. Use both — they fail in different ways.

### Webhook — server to server, reliable

Configure one URL. We `POST` to it when a payment resolves, and keep trying if
you are not there.

```
POST https://z-care.et/hooks/paylink
X-PL-Event:     payment.succeeded
X-PL-Delivery:  WH-7f2a…
X-PL-TS:        1757000000000
X-PL-Signature: <base64url>
```

Body is the sealed envelope, with the **delivery id** as the nonce half of the
AAD:

```
aad = apiKey + "|" + deliveryId      ← the X-PL-Delivery header
```

Verify before you open it:

```js
const expected = crypto.createHmac("sha256", SECRET)
  .update(`${req.header("X-PL-TS")}\n${crypto.createHash("sha256").update(rawBody).digest("hex")}`)
  .digest("base64url");
// compare with req.header("X-PL-Signature") in constant time
```

Opened, it reads:

```json
{
  "event": "payment.succeeded",
  "createdAt": "2026-09-15T08:20:31Z",
  "data": {
    "orderId": "PL-4611-ZunsGsqW",
    "linkId": "PL-4611",
    "status": "paid",
    "amount": "500.00",
    "amountMinor": 50000,
    "currency": "USD",
    "capturedMinor": 50000,
    "refundedMinor": 0,
    "cardBrand": "MASTERCARD",
    "cardLast4": "5567",
    "metadata": { "campaign": "clean-water", "donorId": "9931" },
    "completedAt": "2026-09-15T08:20:29Z"
  }
}
```

**Events:** `payment.succeeded`, `payment.authorized`, `payment.failed`,
`payment.refunded`.

**Answer 2xx** to accept. Anything else is retried after 30s, 2m, 10m, 1h, 6h
and 24h, then given up on — the record stays, and it can be replayed.

**Be idempotent.** Key on `orderId` and `event`. We will not deliberately send
the same pair twice, but a delivery you answered slowly may still arrive again.

### Asking directly — the fallback

```
GET /api/v1/integration/payments/{orderId}
GET /api/v1/integration/links/{id}
```

The payment response is exactly the `data` object above, so the code that
handles a webhook handles a lookup too.

Use this when a webhook was missed, or to reconcile a day's takings. You can
only see payments made against your own links.

### Why both

The payer's redirect can be lost — a closed tab, a flat battery, a train
tunnel. The webhook survives that but depends on your server being up, which is
what the retries are for. Asking directly depends on neither. A donation that
succeeded at the gateway and was never recorded by you is the failure worth
designing against, and it takes two of the three to avoid it.

---

## Going live

Live credentials are not something you request and receive. They are the
outcome of a review.

1. Build and test against `pk_test_…`. Take real test payments through it.
2. Connect the **live** MPGS gateway in the portal.
3. Ask to go live, from the Integrations screen or by asking the bank.
4. A bank administrator looks at the merchant and at what your test traffic
   actually did.
5. On approval, a live integration is created. You collect its credentials
   yourself — they are not handed to the administrator, because they are not
   theirs.

Asking to go live without a single test payment is refused. There would be
nothing for anyone to review.

Live credentials are a **separate integration** with their own key, secret and
encryption key. Your test one keeps working; you will want it.

---

## When something is refused

Errors before the channel opens arrive as plain JSON. Everything after is
sealed like any other response.

| Code | Meaning |
|---|---|
| `credentials_required` | A header is missing. |
| `credentials_invalid` | We do not know that API key. |
| `integration_suspended` | The key is real; access was withdrawn. Talk to the bank. |
| `signature_invalid` | The HMAC did not match. Check you signed the **sealed** body. |
| `timestamp_invalid` | Your clock is more than two minutes out. Fix NTP. |
| `replayed` | That nonce was already used. Generate a new one per request. |
| `payload_invalid` | The body could not be opened. Usually the wrong AAD. |
| `gateway_required` | No verified gateway for this environment yet. |
| `merchant_required` | The account is not attached to a registered merchant. |

### The three that catch everyone

**`signature_invalid`** — nearly always signing the plaintext instead of the
sealed bytes. Sign what you send.

**`payload_invalid`** — nearly always the AAD. It is `apiKey|nonce` for
requests and responses, and `apiKey|deliveryId` for webhooks.

**`timestamp_invalid`** — your server clock. Two minutes either way is the whole
budget, and it exists so a captured request cannot be replayed tomorrow.

---

## Limits

- **600 calls per minute** per API key.
- **256 KB** maximum request body.
- **Two minutes** of clock skew.
- Nonces are remembered for twice that, and are scoped to your key — another
  integrator cannot spend yours.

---

## Administration

Before the portal screens exist, these run inside the API container, which
already has the database and the encryption key configured.

```bash
cd /opt/paylink

# create the integrator account, against a merchant already in the register
docker compose -f docker-compose.prod.yml exec api /paylinkadm integrator \
  -username zcare -merchant 600123456789 -name "Z-Care Platform"

# issue their test integration and credentials
docker compose -f docker-compose.prod.yml exec api /paylinkadm integration \
  -username zcare -name "Z-Care" \
  -webhook https://z-care.et/hooks/paylink

# what exists
docker compose -f docker-compose.prod.yml exec api /paylinkadm list

# promote to live, after reviewing the test traffic it prints
docker compose -f docker-compose.prod.yml exec api /paylinkadm approve-live \
  -integration INT-1042

# issue a fresh secret, keeping the API key
docker compose -f docker-compose.prod.yml exec api /paylinkadm rotate \
  -integration INT-1042
```

Between creating the account and issuing credentials, the integrator signs in
once to set recovery questions and connect the MPGS gateway their links will
settle against. Without that, link creation is refused with `gateway_required` —
there would be no gateway to take the money.
