# Zemen PayLink API (Go)

Backend for the PayLink merchant portal, integrated with **Mastercard Payment
Gateway Services (MPGS)**.

```bash
cd api
cp .env.example .env      # then fill in the two secrets (see below)
go run ./cmd/server       # http://localhost:8080
```

The database is **MySQL 8**. `docker compose up -d db` starts one; the schema is
applied on every boot and a fresh database is seeded with the demo workspace.

```bash
docker compose up -d db                     # from the repository root
cd api && go run ./cmd/server
```

## The sealed channel

Every call to `/api/v1` except the handshake arrives encrypted and signed, and
anything else is refused with `426`. A plain request from curl or Postman gets:

```
{"error":"This API only accepts requests on a secure channel.","code":"secure_channel_required"}
```

```
POST /api/v1/secure/handshake   { publicKey }        ECDH P-256, ephemeral both ends
   → { sessionId, publicKey }                        HKDF-SHA256, salt = sessionId
every later call:
   X-PL-Session  the channel
   X-PL-TS       millis, must be within 2 minutes
   X-PL-Nonce    16 random bytes, usable once
   X-PL-Sig      HMAC(key, method 
 uri 
 ts 
 nonce 
 sha256(body))
   body          AES-256-GCM, AAD = sessionId|nonce
   ← response    AES-256-GCM under the same key and nonce
```

Because the signature covers the method, the **full URI including the query
string**, and a hash of the body, a captured request cannot be aimed at another
endpoint, have `?range=30d` edited, or have its payload swapped. The nonce makes
it usable exactly once, and the timestamp bounds how long a capture is worth
keeping.

**What this does and does not buy.** It encrypts payloads independently of
transport, and it means a caller must have completed the handshake in a real
page rather than pasting JSON into a REST client. It is *not* proof of who is
calling: the page's own JavaScript is delivered to the browser, so anyone
determined enough to drive a headless browser can obtain a channel. Every
authorisation decision still happens server-side, where it belongs.

**TLS is still required, and not optional.** The handshake key is
unauthenticated, so an *active* man in the middle can present their own key —
only a certificate fixes that. Browsers also withhold WebCrypto outside a
secure context, so the portal simply will not work over plain HTTP on anything
but localhost.

```bash
npm run cert        # self-signed, covers localhost and every local IPv4
npm run dev:secure  # https://localhost:3000 and https://<lan-ip>:3000
```

The development certificate is self-signed: a browser warns once per device.
Production needs a certificate from a CA the device already trusts.

## Lockout and rate limits

Two different controls, doing two different jobs. A rate limit slows an attacker
down; a lockout stops them, including the patient, distributed guess that stays
under any per-minute budget.

**Lockout — four wrong answers, fifteen minutes, opens on its own.**

```
#1 401   #2 401   #3 401   #4 429 locked   #5 429 locked
Retry-After: 900
"This account is locked for 15 more minute(s), then unlocks on its own."
```

- Applies to **sign-in and recovery**, keyed on whatever username was typed —
  real or not. An unknown name locks identically, so being locked out is not a
  way to learn who is registered.
- **Releases itself.** A lock an administrator must lift is an outage, and it
  hands an attacker a way to take any named operator offline for the day.
- A correct password **clears the count**, so three typos before getting it
  right cost nothing.
- Old failures age out after fifteen minutes: four mistakes spread over a month
  are not an attack.

**Budgets, per endpoint.** The right key differs by endpoint — an address for
things anyone can reach, an account for things a session can abuse.

| Endpoint | Budget | Key | Why this one |
|---|---|---|---|
| Sign-in | 30/min | address | stops one source sweeping many accounts; the lockout handles single-account guessing |
| Sign-in | 30/min | username | caps a distributed attempt before the lockout closes it |
| Registration | 5/10min | address | the only place the merchant register can be probed; **reset on success** so a branch can onboard its whole team |
| Recovery | 5/hour | address + account | answers carry little entropy |
| Capture / refund / void | 20/min | operator | the most damaging thing a stolen session can do |
| Gateway credentials | 5/15min | operator | each attempt sends a password to Mastercard — an unbounded endpoint here is a credential-guessing oracle |
| Link creation | 60/hour | operator | |
| Sharing | 30/hour | operator | can send mail on the operator's behalf |
| Public checkout | 12/min | address | opens a real gateway session, and no sign-in guards it |
| Handshake | 60/min | address | |
| Everything else | 120/min | address | |

Covered by `internal/api/lockout_test.go` and an end-to-end suite of 13 checks.

## Hardening

| Control | Where |
|---|---|
| Sign-in throttled per address **and** per username, reset on success | `guard.go`, `auth_handlers.go` |
| Password always verified, even for an unknown username | `auth_handlers.go` — an early return would time-leak who exists |
| Registration throttled; unregistered merchant numbers logged | `register_handlers.go` |
| JWT restricted to HS256 with issuer checked | `auth/auth.go` — `alg=none` and role tampering both fail |
| Merchant number never accepted from a request body | `gateway_handlers.go` — it comes from the register |
| Unknown JSON fields rejected | `httpx.Decode` — no mass assignment |
| `X-Forwarded-For` honoured only from loopback | `guard.go` — otherwise a caller picks their own rate-limit identity |
| CSP, nosniff, frame denial, no-store, Permissions-Policy | `guard.go`, `next.config.ts` |
| `unsafe-eval` in development only | `next.config.ts` — React needs it to debug, production never does |
| Demo accounts refuse to exist outside development | `seed.go` — startup fails if one still holds the README password |
| Portal will not render with JavaScript disabled | `layout.tsx` — without it there is no channel, so nothing shown could be trusted |

Verified with an adversarial suite covering replay, signature relocation, query
tampering, payload swapping, forged signatures, clock skew in both directions,
invented channel ids, off-curve handshake keys, `alg=none`, role escalation,
cross-role writes, IDOR and brute force. All refused; legitimate traffic
unaffected.

## Account recovery

Set up on the way in, not left in a settings page: an operator who has already
forgotten their password cannot configure recovery.

```
sign in → connect gateway → set recovery questions → workspace
```

Three questions from a fixed list, all three required to recover.

| Decision | Why |
|---|---|
| Answers bcrypt-hashed, never returned | people reuse answers across services; a breach here must not leak them elsewhere |
| Current password required to set or change them | otherwise a session someone else got hold of installs its own answers and keeps the account |
| All three must match; a wrong one is never named | naming it turns three small guesses into three separate one-question problems |
| Every answer checked even after one fails | otherwise the response time says which one was wrong |
| Unknown usernames get **decoy questions**, stable per name | asking is otherwise a way to discover who is registered |
| Answers and the new password in **one request** | a two-step flow needs a reset ticket, and a ticket is one more credential to intercept, mis-expire or replay. There is nothing in between to steal |
| Reset ends **every** session for that account | a reset that leaves an intruder signed in has recovered nothing |
| New password gets the full policy, cannot repeat the old one or be an answer | recovery is not a way around the password rules |
| Five attempts an hour, per account and per address | answers carry little entropy; the budget is what makes guessing impractical |
| No free-text question | a custom prompt would stand out against the decoys and confirm the account exists |

Verified end to end in 23 checks covering wrong passwords, duplicate questions,
identical answers, off-list prompts, partial answers, weak and reused new
passwords, session termination, case-and-spacing tolerance, and rate limiting.

### Measured against OWASP ASVS 4.0

| Control | Requirement | State |
|---|---|---|
| 2.1.1 | 12 characters minimum | **12**, was 8 |
| 2.1.2 / 2.1.3 | at least 64 accepted, none truncated | 72 bytes accepted; longer is **refused, not cut** — bcrypt ignores past 72, so two long passwords would otherwise share an account |
| 2.1.4 | all printable Unicode, spaces included | passphrases and Amharic both accepted |
| 2.1.7 | checked against breached passwords | deny-list consulted after undoing leetspeak and stripping trailing digits — `password1234`, `P@ssw0rd1234` and `ZemenBank2026` all refused |
| 2.1.9 | **no composition rules** | the old "must mix letters and symbols" rule was **removed** — it is a finding, not a control |
| 2.2.1 | anti-automation on authentication | throttled per address and per username |
| 2.3.1 | no default or shared passwords | demo accounts are development-only; startup fails otherwise |
| 2.4.1 | approved password hashing | bcrypt, cost 10 |
| 3.3.1 | signing out terminates the session | server-side revocation — the token stops being accepted |
| 3.3.2 | idle timeout | 30 minutes, 12-hour absolute |
| 4.x | access control server-side | verified by the adversarial suite |
| 5.3.4 | parameterised queries | throughout |
| 7.1.1 | no secrets in logs | API passwords never logged |
| 8.3.4 | sensitive data not cached | `Cache-Control: no-store` |
| 14.4.x | security headers | CSP, nosniff, frame denial, Permissions-Policy |

Password rules are covered by tests in `internal/auth/password_test.go`, including
the leetspeak, year-suffix and bcrypt-truncation cases.

### Known gaps, for the pen-test report

These are real and deliberate; none is hidden.

- **No multi-factor authentication.** ASVS 2.7/2.8 expects it at level 2 for a
  payment application. This is the largest remaining gap.
- **Session token in `localStorage`.** Readable by any script that achieves
  XSS. The CSP is the compensating control; an httpOnly cookie plus CSRF
  defence is the fix.
- **Recovery is by security question**, which ASVS 2.5.2 and NIST 800-63B both
  say not to use. It is here because a self-registered operator supplies no
  email address, so there is nothing to send a reset link to. See below for how
  it is built; expect a pen tester to raise it regardless. Email or SMS
  verification is the upgrade path.
- **Deny-list is a starter set.** ASVS 2.1.7 is properly satisfied by the full
  Pwned Passwords corpus or its range API, which never transmits the password.
- **Sessions are held in memory.** A restart signs everyone out. Safe direction,
  but it is not a cluster-ready design.
- **The development certificate is self-signed.** Production needs a real one.

### What is deliberately not implemented

Blocking F12, the context menu or devtools. It cannot be made to work — the
browser belongs to whoever is sitting at it, and any key handler is bypassed by
a menu, a proxy, or `curl` — and it costs real accessibility. Security here does
not depend on the client hiding anything: the bundle ships without source maps,
the CSP stops injected script, and nothing sensitive exists client-side to find.

## Accounts and the merchant register

Two roles are served: **operators** (MPGS "Operator" — the `sales` role) and
**merchant management**. The bank-admin and merchant-workspace screens are not
offered, and no role routes to them.

**Merchant management** keeps one list: the merchant number issued by the
gateway, and the name that number trades under. That name is what a payer sees
on a receipt, so this is the single place a merchant's identity is decided.

**Operators register themselves** — username, password, confirmation and a
merchant number:

```
POST /api/v1/auth/register  { username, password, confirmPassword, merchantNumber }
   ↓  merchant number must already be in the register
   ↓  account created, active, tied to that merchant
   → sign in
```

The merchant number is the control on self-registration: an account can only
attach to a merchant the bank has onboarded, and the merchant *name* is taken
from the register rather than typed, so two operators on one merchant can never
disagree about what appears on a receipt.

Because the number is fixed at registration, **connecting a gateway never asks
for it again** — the connect screen shows "Your merchant" read-only and collects
only the host and API password. Where the acquirer issues a different number for
production, merchant management records it as the entry's live number and the
right one is used per environment.

Sign-in is by **username**. Accounts created before this keep working with their
email address, which was migrated in as their username.

| Endpoint | Who |
|---|---|
| `POST /api/v1/auth/register` | public, gated by the merchant number |
| `GET/POST /api/v1/merchant-register` | merchant management |

## The Operator model

Mastercard calls the person who transacts against a merchant profile an
**Operator**. In this portal that is the `sales` role, and the flow is:

1. Merchant management registers the merchant number and its name.
2. The operator registers themselves against that number — see above.
3. On sign-in the API answers `requiresGateway: true` while the operator has no
   verified MPGS credentials. The portal sends them to **Connect your gateway**.
4. The operator picks **test or live**, then enters that environment's gateway
   host and **API password**. The merchant number is already fixed from
   registration and is shown, not asked for. The API proves the credentials
   against that gateway before storing anything (`POST /session` — the cheapest
   authenticated call).
5. Only then can they create payment links. `POST /api/v1/links` returns
   `409 gateway_required` otherwise.
6. When a customer pays, the checkout session is opened with **that operator's**
   credentials, because the link records who created it.

## Test and live are separate worlds

An operator holds **one MPGS connection per environment** and works in one of
them at a time. The two never share data.

| | Test | Live |
|---|---|---|
| Host | `test-gateway.mastercard.com` | `ap-gateway.mastercard.com` (also `eu-`, `na-`) |
| Cards | simulated | real |
| Money | none | real |

- The environment is chosen on **Connect your gateway**, alongside the host and
  API password. Each environment has its own password, so switching the toggle
  loads that connection rather than carrying the other one's details across.
- A link records its environment **when it is created, and never changes it**.
  Every payment, capture, refund, void and reconciliation on that link uses that
  gateway for the rest of its life — so going live does not break links already
  in customers' hands, and a live order is never addressed to the simulator.
- Listings and analytics are scoped to the environment the operator is in.
  **Test takings are never added to real ones**; that is the whole point of the
  separation, and the portal wears a `TEST MODE` badge whenever it applies.
- `POST /api/v1/gateway/environment` switches between connections already held.
  It refuses to switch to one that was never verified.

### Which hosts are accepted, and why it matters

Whatever host is entered is where that operator's API password gets sent. An
unchecked field there would let anyone who can talk an operator into pasting a
hostname collect live gateway credentials. So the host must be:

- on **`*.mastercard.com`**, or
- explicitly allowed by the bank via `PAYLINK_GATEWAY_EXTRA_HOSTS` (for an
  acquirer-branded MPGS endpoint).

A host we publish must also match the environment it was chosen for — the test
gateway cannot be registered as a live connection, or the reverse. Labelling
production as a rehearsal is how a real charge gets mistaken for a test.

Credentials are stored **only after the gateway accepts them**, so a failed
attempt at connecting live leaves an existing test connection untouched.

### How the API password is protected

- Sealed with **AES-256-GCM** (fresh nonce per write) using `PAYLINK_ENCRYPTION_KEY`.
- Never returned to any client — reads give `apiPasswordMasked` (`af26••••••••b21c`).
- Never logged.
- Verified before it is stored, so a typo fails at setup rather than at checkout.
- Changing `PAYLINK_ENCRYPTION_KEY` makes stored credentials unreadable; operators
  would have to reconnect.

## Payment flow

MPGS **Hosted Checkout** is used, so card data never reaches our servers.

```
customer opens /l/{slug}
      │
      ▼
GET  /api/v1/public/links/{slug}          → title, merchant, amount, availability
POST /api/v1/public/links/{slug}/checkout → INITIATE_CHECKOUT on the gateway
      │                                      returns session.id + successIndicator
      ▼
browser loads checkout.min.js from the gateway, Checkout.showPaymentPage()
      │
      ▼   (card entered on Mastercard's page)
returnUrl → /l/{slug}/return?order=…
      │
      ▼
GET /api/v1/public/payments/{orderId}     → RETRIEVE ORDER, authoritative result
```

A gateway session is short-lived while a pay link may live for weeks and be paid
many times, so **a session is created per payment attempt**, not per link. Each
attempt gets its own order id (`PL-1234-a1b2c3d4`), which is what reconciliation
keys on.

The redirect's `resultIndicator` is only a hint — the server re-reads the order
from the gateway before it marks anything paid, and a link's paid totals are only
incremented on the transition into `paid`, so repeated polling cannot inflate them.

## Split bills — several payers, one total

A `split` link carries a **target**: the bill total. Each contribution is an
ordinary gateway order; the running balance is ours, because **MPGS has no
concept of an order balance drawn down by several payers**. Searching the v100
operation set for `split`, `outstanding` or `remaining` returns nothing — the
only partial concepts it has are partial capture and partial refund.

```
Team dinner — Br 1,000.00
  Abel  Br 400.00 paid   →  Br 600.00 left   40%
  Liya  Br 350.00 paid   →  Br 250.00 left   75%
  Sami  Br 250.00 paid   →  Br   0.00 left  100%  → settled
```

- The payer sees the total, the progress bar and what is left; the amount box
  defaults to the remainder so paying the rest is one tap.
- **Overpaying is impossible** — a contribution above the remaining balance is
  refused with the exact figure. Contributions in flight are not reserved, so
  two late payers can race; the loser is told what is really left.
- The link **settles itself** at the target and turns further payers away.
- A **refund reopens it** by exactly the refunded amount, the same symmetry a
  void gives a limited-use link.
- Contributor names are shown to the operator only. The pay page publishes the
  count and the amounts, never who paid — anyone holding the link would see them.

`type: "split"` with a `target`; optional `min` sets a floor per contribution.

## Charge now, or reserve and settle later

A link carries a **payment mode**:

| Mode | Gateway operation | What happens |
|---|---|---|
| `purchase` (default) | `PURCHASE` | The money is taken when the payer confirms |
| `authorize` | `AUTHORIZE` | Funds are reserved; the merchant captures later |

An authorization can be captured **more than once for less than the full amount**,
which is how one payment is settled in parts:

```
AUTHORIZE $900  →  CAPTURE $350  →  CAPTURE $200  →  CAPTURE $350
                   PARTIALLY_CAPTURED ─────────────→  CAPTURED
```

Verified on merchant `000000001100`: $40 + $35 + $25 against a $100
authorization, with the gateway refusing the over-capture itself.

### Operations

| Endpoint | Effect |
|---|---|
| `POST /api/v1/payments/{orderId}/capture` | Take reserved funds. Omit `amount` for the remainder |
| `POST /api/v1/payments/{orderId}/refund` | Return captured funds, in full or in part |
| `POST /api/v1/payments/{orderId}/void` | Release an untouched authorization |
| `GET /api/v1/payments/{orderId}` | Balances, what is still possible, and the operation history |

Scoped like the link itself: its operator, the merchant owner, or a bank admin.

### Not moving money twice

Each operation re-reads the order from the gateway **before** deciding anything,
so the remaining balance comes from MPGS rather than from our own record. A
double submit, or a capture someone made in Merchant Administration, is caught
here rather than taking the money again. MPGS enforces this too; doing it first
just makes the failure legible.

Every attempt — including failures — consumes a gateway transaction id and is
written to `payment_operations` with who performed it, so the audit trail shows
what was tried as well as what worked.

### What a link's totals mean

`paid_minor` is **captured minus refunded**, recomputed from the payments rather
than incremented, because captures and refunds move it in both directions. A use
is consumed once the payer commits funds; **voiding an authorization gives the
use back**, so a one-time link becomes payable again.

## Transaction references

Every payment carries the identifiers it is known by outside this system, pulled
off the order's transactions and stored on the payment:

| Field | Example | What it is for |
|---|---|---|
| `gatewayReceipt` | `622521040906` | look the payment up in Merchant Administration |
| `authorizationCode` | `149369` | the issuer's approval code — quoted in disputes |
| `acquirerReference` | `0013JN` | matches the acquirer's own settlement file |
| `settlementDate` | `2026-08-14` | when the funds actually land |
| `orderId` | `PL-3608-nSu7JyQe` | our reference, ties back to the link |

The receipt and approval code come from the authorization and stay constant
across every capture and refund on that order; the settlement date only appears
once funds are captured, so the latest one wins.

Rows written before these were recorded are **backfilled on read** — a settled
payment with no receipt is re-read from the gateway once, then stops matching.
No migration script.

## Analytics — derived, never stored

`GET /api/v1/analytics?range=30d` answers the My Payments screen. Every figure is
computed from the payments table at request time rather than kept in a rollup:
the volumes are small, and a derived number cannot drift out of step with a late
capture or a refund.

- **Collected** is `captured − refunded`, so a refund moves it back down.
- **Successful** counts payers who committed funds, reserved or captured.
  Attempts that were opened and never finished are not successes.
- **Success rate** is successful ÷ every attempt, and the outcome strip below
  the tiles lists the whole denominator (`43 successful · 35 not completed ·
  3 awaiting the payer`) so the percentage can be checked rather than trusted.
- **Change** compares against the equally long window immediately before. With
  no earlier activity it is `null`, not `+100%` — a first week has not grown.

Currencies are **never added together**. The busiest one leads and the rest are
reported beside it, because folding ETB into USD would need an FX rate we do not
have and would fabricate a number.

The chart groups to fit: 7D and 30D by day, 90D by week, YTD by month. Days that
took nothing are still charted, since a quiet week is a fact about the period.

Scoping follows the same rule as everything else — an operator's figures cover
the links they created, a merchant's cover their workspace, a bank admin sees
everything.

## Receipts

`GET /api/v1/public/receipts/{orderId}` backs a printable receipt at
`/r/{orderId}`, reachable from the payer's confirmation page and from
**Customer receipt** in the operator's payment detail.

It is a record of what happened to the money, not a confirmation that money was
taken:

| Payment | Receipt says | Headline figure |
|---|---|---|
| `paid` | Paid in full | the amount |
| `authorized` | **Reserved — not yet charged** | amount reserved, net **zero** |
| `partially_captured` | Partly charged | net actually taken |
| `partially_refunded` | Partly refunded | net after the refund |
| `refunded` | Refunded in full | net **zero** |
| anything else | `409 no_receipt` | — |

- The **activity list** shows the authorization and every capture and refund, so
  a partly refunded receipt explains why its total is not what the payer
  remembers agreeing to. Failed operations are left out — they moved no money.
- A **test receipt is watermarked** and says it is not valid proof of payment.
  Without that, a rehearsal prints as evidence of a real one.
- It is keyed on the order id the payer already holds from their return URL —
  the same capability that opens the status endpoint, no wider. The id carries
  56⁸ of `crypto/rand` entropy in its suffix, so it cannot be enumerated.
- Printing, not PDF generation: every browser prints to PDF, the output keeps
  the real fonts and the bank's mark, and there is no PDF library to keep in
  step with the design.

## Reconciliation — why a status is trustworthy

A payer who pays and then closes the tab never reaches our return URL. Without
help, that attempt would sit at `initiated` forever even though the money moved,
and the operator would think the link was never paid.

So the server re-checks in-flight attempts with `RETRIEVE ORDER`
(`internal/api/reconcile.go`):

- **On read** — opening a link detail or listing payments reconciles that scope
  first, throttled to one gateway lookup per attempt per 15s. `?force=1` skips
  the throttle for an explicit refresh.
- **In the background** — a sweeper runs every 2 minutes so reports stay
  accurate with nobody watching.
- **Abandonment** — if the gateway still has no order 45 minutes after the
  attempt started, the checkout timed out and it is recorded as abandoned rather
  than left pending forever.

Every lookup stamps `payments.last_checked_at`, so a gateway outage cannot turn
page views into a retry storm. Work is bounded (12 attempts per pass, 4 at a
time) and credentials are resolved once per link rather than once per attempt.

`GET /api/v1/links/{id}` returns a `summary` alongside the payments:

```json
{ "attempts": 3, "paid": 2, "pending": 1, "failed": 0,
  "abandoned": 0, "collectedDisplay": "$240.00" }
```

## Endpoints

| Method | Path | Notes |
|---|---|---|
| POST | `/api/v1/auth/login` | → token, user, `requiresGateway` |
| GET | `/api/v1/auth/me` | current session |
| GET | `/api/v1/auth/invite/{token}` | who an invite is for |
| POST | `/api/v1/auth/activate` | set password, sign in |
| GET/PUT/DELETE | `/api/v1/gateway/credentials` | operator's MPGS identity, per environment |
| POST | `/api/v1/gateway/environment` | switch between test and live |
| GET/POST | `/api/v1/links` | list / create (role-scoped) |
| GET | `/api/v1/links/{id}` | link + its payments |
| POST | `/api/v1/links/{id}/status` | active / paused / cancelled |
| POST | `/api/v1/links/{id}/share` | email, sms, whatsapp, copy, qr, other |
| GET | `/api/v1/payments` | role-scoped |
| GET | `/api/v1/analytics` | `?range=7d\|30d\|90d\|ytd`, role-scoped |
| GET/POST | `/api/v1/team` | merchant invites operators |
| GET | `/api/v1/branches` | |
| GET | `/api/v1/public/links/{slug}` | payer-facing, no auth |
| POST | `/api/v1/public/links/{slug}/checkout` | opens Hosted Checkout |
| GET | `/api/v1/public/payments/{orderId}` | reconciled status |
| GET | `/api/v1/public/receipts/{orderId}` | printable receipt |

Visibility is scoped by role: an operator sees only links they created, a
merchant sees their whole workspace, a bank admin sees everything.

## Sharing

`POST /api/v1/links/{id}/share` records every share for audit and then:

- **email** — delivered over SMTP when configured, otherwise logged and reported
  back as `delivered: false` so the UI can say so honestly.
- **whatsapp** / **sms** — returns a ready-built `shareUrl` (`https://wa.me/…`,
  `sms:…`) for the browser to open. Nothing is sent server-side.
- **copy** / **qr** / **other** — recorded only.

## Configuration

| Variable | Purpose |
|---|---|
| `PAYLINK_JWT_SECRET` | signs session tokens (≥32 chars, required) |
| `PAYLINK_ENCRYPTION_KEY` | base64 of 32 bytes, seals API passwords (required) |
| `PAYLINK_PUBLIC_BASE_URL` | where pay links are served; also the gateway return URL. `lan` (or `lan:3100`) resolves this machine's network address each boot |
| `PAYLINK_CORS_ORIGINS` | comma-separated allowed origins |
| `PAYLINK_GATEWAY_HOST` | default gateway (`test-gateway.mastercard.com`) |
| `PAYLINK_GATEWAY_EXTRA_HOSTS` | extra MPGS hosts operators may connect to, beyond `*.mastercard.com` |
| `PAYLINK_GATEWAY_API_VERSION` | default `100` |
| `PAYLINK_DATABASE` | SQLite path |
| `PAYLINK_SMTP_*` | optional outbound email |

Both secrets are required — the server refuses to start without them rather than
falling back to a default that could reach production.

## Demo accounts

Seeded on first boot, password `Zemen@2026`:

| Email | Role |
|---|---|
| `admin@zemenbank.et` | bank admin |
| `merchant@sheba.et` | merchant owner |
| `meseret.a@sheba.et` | sales operator |
| `dawit.a@sheba.et` | sales operator |
| `selam.b@sheba.et`, `yoh.t@sheba.et` | sales operators |

To re-seed, stop the server and delete `paylink.db*`.

## Testing from another device

Set `PAYLINK_PUBLIC_BASE_URL=lan` and open the address the API logs at startup
(`publicBaseURL=http://…:3000`) on the other machine.

Only **port 3000** is exposed. The portal calls `/api/v1/*` on whatever host it
was loaded from and `next dev` proxies that to the API, so the API stays bound
to `127.0.0.1` and never appears on the network. Windows Firewall must allow
inbound 3000 — it prompts the first time, or:

```powershell
New-NetFirewallRule -DisplayName "PayLink dev 3000" -Direction Inbound `
  -Protocol TCP -LocalPort 3000 -Action Allow -Profile Private
```

`lan` resolves by asking the OS which source address it would use for an
outbound packet, so it picks the interface holding the default route rather than
a VirtualBox or WSL adapter. A new DHCP lease is picked up on the next restart —
but links already shared carry the old address, so re-share after a change.

## The database

MySQL 8, InnoDB, `utf8mb4_0900_ai_ci` throughout — Amharic in a merchant name or
a recovery answer has to survive the round trip, and the case-insensitive
collation is what makes username lookups case-insensitive without a `COLLATE` on
every query.

Two conventions are worth knowing before reading the schema:

- **Identifiers are `VARCHAR`, not `TEXT`.** MySQL cannot index a `TEXT` column
  without a prefix length, and every id here is a key or a foreign key.
- **Timestamps are RFC3339 strings, not `DATETIME`.** They compare
  lexicographically in exactly the order they compare chronologically, which is
  what lets the analytics queries do range comparisons and
  `SUBSTR(created_at, 1, 10)` to bucket by day. `parseTime` is forced off in the
  DSN so the driver cannot quietly turn them into `time.Time` and break that.

Foreign keys are enforced, so a payment cannot exist without its link and
deleting a link takes its payments with it.

### Coming from the SQLite build

```bash
go run ./cmd/sqlite2mysql -sqlite paylink.db   -mysql "paylink:paylink@tcp(127.0.0.1:3306)/paylink"
```

Copies parents first so the foreign keys hold, and uses `INSERT IGNORE`, so
running it twice tops up rather than duplicating. Sealed gateway passwords cross
as raw bytes and stay readable **provided `PAYLINK_ENCRYPTION_KEY` is
unchanged** — change it and every operator has to reconnect their gateway.

### Two MySQL differences that bite

- `UPDATE`ing a table while a subquery reads from it is **error 1093**. The
  "leave the operator on whatever connection remains" step in
  `DeleteGatewayCredential` is two statements for that reason.
- `ONLY_FULL_GROUP_BY` is on by default and left on. The leaderboard query names
  every non-aggregated column in its `GROUP BY` rather than having the mode
  turned off — leaving one out asks the database to pick a row arbitrarily.
