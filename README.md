# Zemen PayLink

Merchant portal for Mastercard-backed pay-by-link payments.

```
index.html   the original design prototype (kept for reference)
web/         Next.js 16 + TypeScript frontend
api/         Go backend, integrated with Mastercard Payment Gateway Services
```

## Running it

Two terminals:

```bash
cd api && go run ./cmd/server            # http://localhost:8080
cd web && npm run dev -- -H 0.0.0.0      # http://localhost:3000
```

`-H 0.0.0.0` makes the portal reachable from other machines; drop it for
localhost-only.

## Testing from another machine

The browser only ever talks to **port 3000** — Next proxies `/api/v1/*` through
to the Go API — so there is a single port to expose and no CORS to configure.

**On the same network.** Find this machine's LAN address (`ipconfig`) and set the
API's `PAYLINK_PUBLIC_BASE_URL` to it, so generated links point somewhere the
other machine can actually reach:

```bash
# api/.env
PAYLINK_PUBLIC_BASE_URL=http://192.168.1.50:3000
```

Restart the API, and every link — old ones included, since the URL is derived
rather than stored — is now shareable at that address. Two things to know:

- Windows Firewall must allow inbound TCP 3000 on the network's profile. If it
  blocks, run as administrator:
  `New-NetFirewallRule -DisplayName "Zemen PayLink 3000" -Direction Inbound -Action Allow -Protocol TCP -LocalPort 3000 -Profile Private,Domain`
- A DHCP address can change; update `PAYLINK_PUBLIC_BASE_URL` if it does.

`next dev` refuses cross-origin access to its own resources, which breaks
hydration when opened by IP. `next.config.ts` handles this by allowing this
host's own addresses automatically — add anything else (a tunnel hostname) via
`PAYLINK_DEV_ORIGINS`.

**Over the internet.** Tunnel port 3000 and point the API at the tunnel URL:

```bash
ngrok http 3000                                  # gives https://<id>.ngrok-free.app
```

```bash
# api/.env
PAYLINK_PUBLIC_BASE_URL=https://<id>.ngrok-free.app
```

```bash
# web, before npm run dev
PAYLINK_DEV_ORIGINS=<id>.ngrok-free.app
```

Restart both. Because the API is proxied, the tunnel only needs the one port.

The API creates and seeds its SQLite database on first boot. Sign in at
<http://localhost:3000> with any seeded account (password `Zemen@2026`) — the
role buttons on the login screen fill one in for you.

## The operator journey

This is the path that is wired end to end:

1. **Sign in** as a sales operator (`dawit.a@sheba.et`).
2. **Connect your gateway** — the operator enters the MPGS merchant ID and API
   password issued to them. The API verifies these against the live gateway
   before storing them, encrypted. Until this is done, creating links is refused.
3. **Create a pay-by-link** through the wizard or the quick form.
4. **Share it** by SMS, email, WhatsApp, the system share sheet, a copied URL, or
   the QR code — which encodes the real link.
5. **The customer opens the link**, taps *Pay securely*, and is handed to
   Mastercard's Hosted Checkout page. Card details never touch this application.
6. **Open the link from *My Links*** to see every attempt against it — paid,
   held, pending, failed or abandoned — with the customer name and card used,
   plus a *Refresh* button that re-checks each one with the gateway.
7. **Click a payment** to capture, refund or void it, in full or in part.

That last step holds even if the customer pays and immediately closes the tab
without ever returning to the site: the server re-reads the order from
Mastercard, so the operator still sees the payment as successful. See
*Reconciliation* in `api/README.md`.

See `api/README.md` for the credential model, the payment flow and the endpoint
list, and `web/README.md` for how the frontend keeps the prototype's design.

## What is live, and what is not

Live against the API and the gateway:

- authentication and sessions for every role
- the operator's gateway credentials
- creating, listing, pausing/resuming and sharing pay links
- **split bills** — one total, several payers, a live remaining balance, and the
  link settling itself when the bill is covered
- **charge now, or reserve now and capture later** — including capturing one
  authorization in parts, which is how a payment is split across settlements
- **refunds**, full or partial, and **voiding** an untouched hold
- the public pay page, Hosted Checkout, and payment reconciliation
- *My Links*, the link detail with per-attempt outcomes, and the transaction
  table in *My Payments*
- QR codes, which encode the real link

Still showing the prototype's demo figures:

- the admin and merchant dashboards
- the KPI tiles and charts above the transaction tables (the tables themselves
  are live)
- branches, team and settings screens

These were outside the scope of the operator flow and are the natural next
increment — the data they need is already exposed by the API.

## Security notes

- The gateway API password is sealed with AES-256-GCM, never returned to a
  client (only a masked form), and never logged.
- `api/.env` holds the local secrets and is gitignored; `api/.env.example`
  documents what is needed.
- Card data is entered on Mastercard's own hosted page, so this application
  stays outside PCI scope for cardholder data.
- The test gateway credentials used during development belong in an operator's
  account through the UI, not in any config file.
