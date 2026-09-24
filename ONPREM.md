# Deploying on your own Ubuntu server

The whole portal on one machine: TLS terminator, pages, API and MySQL. Four
containers, one command.

```
                    ┌────────── Caddy (port 2000) ──────────┐
   customers ──▶    │  /api/v1/*, /healthz  →  api:8080     │
   operators  ──▶   │  everything else      →  web:3000     │
                    └───────────────┬───────────────────────┘
                                    │  private network, nothing published
                                 db:3306
```

Everything is one hostname and one port, so there is no CORS and nothing
crosses a network that does not have to.

**Only port 2000 is published.** Nothing binds 80 or 443, so this sits
alongside whatever else the host is already running.

---

## Before you start — read this one first

**Your customers must be able to reach this server.** The product sends payment
links to people who open them on their phones, off your network. A server that
only answers inside the bank can be used for internal testing and nothing else —
operators will create links that no customer can pay.

So one of these has to be true:

- the server sits in a **DMZ** with a public hostname, or
- it is published through the bank's existing **reverse proxy or WAF**, or
- you are knowingly running an internal-only pilot

**The server also needs outbound HTTPS** to `test-gateway.mastercard.com` (and
later `ap-gateway.mastercard.com`). Every payment, capture and refund is a call
out to Mastercard. If egress is filtered, those hostnames need allowing.
`scripts/preflight.sh` checks this for you.

## What you need

- Ubuntu 22.04 or 24.04, 2 GB RAM and 20 GB disk is comfortable
- Docker and the compose plugin
- Port 2000 reachable by whoever needs to use it
- The address it will be served on — a hostname, or just the IP

```bash
sudo apt update && sudo apt install -y docker.io docker-compose-plugin openssl curl
sudo usermod -aG docker $USER && newgrp docker
```

## Getting the code onto the server

There is no git remote, so copy the bundle across:

```bash
# from your workstation
scp paylink.tar.gz user@<server>:/tmp/

# on the server
sudo mkdir -p /opt/paylink && sudo chown "$USER" /opt/paylink
tar -xzf /tmp/paylink.tar.gz -C /opt/paylink && cd /opt/paylink
```

## Install

```bash
bash scripts/preflight.sh     # checks egress, warms the image cache
bash scripts/install.sh       # asks three questions, then builds and starts
```

Run preflight first. It confirms the server can reach Docker Hub, the Go and
npm registries and the Mastercard gateway, and pulls the base images with
retries — so a dropped TLS handshake costs one retry rather than failing a
build several minutes in. It starts nothing and changes nothing else.

The installer generates every secret itself, verifies the encryption key
decodes to exactly 32 bytes, builds the images and starts the stack. It is safe
to re-run: an existing `.env.production` is never overwritten.

The bootstrap password for the `management` account is printed at the end and
written to `.env.production`. **Change it after the first sign-in.**

Then open the firewall:

```bash
sudo ufw allow 2000/tcp
```

### The one question worth thinking about: HTTPS

HTTPS is not optional. Browsers withhold WebCrypto outside a secure context, and
without it the portal cannot open the sealed channel the API requires — the
whole thing simply will not work over plain HTTP.

| Choose | When | Cost |
|---|---|---|
| **1. Your own certificate** | the bank already has one for this address | put `cert.pem` and `key.pem` in `./certs` |
| **2. Internal CA** | internal pilot only | every device warns until Caddy's root is trusted |

Let's Encrypt is not offered: its challenges need port 80 or 443, and this
deployment publishes neither.

If you pick 2, distribute Caddy's root so browsers stop warning:

```bash
docker compose -f docker-compose.prod.yml cp \
  caddy:/data/caddy/pki/authorities/local/root.crt paylink-root.crt
```

Push that through group policy, or import it on each device.

## First run

1. Open `https://<your address>:2000` and sign in as **management**
2. **Change the bootstrap password**
3. Register your merchant number and the name it trades under — that name is
   what appears on customers' receipts
4. Have an operator register against that number, then connect their gateway
5. Create a link, pay it with a test card, refund it, open the receipt

## Sessions

Three rules, all enforced by the API on every request and mirrored in the
browser so nobody is left on a screen that has already stopped working:

| Rule | Default | Setting |
|---|---|---|
| Absolute lifetime, never extended | 15 minutes | `PAYLINK_SESSION_TTL` |
| Signed out when left untouched | 3 minutes | `PAYLINK_SESSION_IDLE` |
| One session per account | always | — |

The lifetime runs from signing in and is not refreshed by use: fifteen minutes
of continuous work still ends in signing in again. Thirty seconds before an
idle sign-out the page offers to stay signed in.

Only deliberate input counts as activity — a click, a key, a scroll. Mouse
movement does not, and that is on purpose: it fires on its own often enough
that counting it would hold an unattended machine signed in indefinitely,
which is the exact situation the idle timeout exists to close.

Signing in while the account is already signed in elsewhere is refused, with
the offer to end that session and continue. Taking it over signs the other
device out immediately.

Both windows can be shortened freely. Lengthening them is a decision worth
recording — they are what limits the value of a screen left unlocked.

## Sharing a host with other stacks

This compose project is named `paylink`, so its containers, network and volumes
never collide with anything else on the box. Two rules keep it that way:

- **Always pass `-f docker-compose.prod.yml`.** A bare `docker compose` command
  in this directory picks up the development file instead.
- **Never run `docker system prune`** on a shared host. It removes other
  stacks' unused images and volumes too.

## Publishing through the bank's reverse proxy

To reach this from outside the bank — `https://share.zemenbank.com/paybylinkapi`
— while the internal address keeps working, add these to `.env.production` and
rebuild:

```bash
# The host the proxy forwards, WITH the port. A proxy usually passes the
# original Host through, and Caddy answers 404 to a name it was not told about.
PAYLINK_PUBLIC_SITE=share.zemenbank.com:2000

# The path the proxy publishes under and strips before forwarding.
PAYLINK_PUBLIC_PATH_PREFIX=/paybylinkapi

# The proxy's own address. Needed twice, for two different jobs — see below.
PAYLINK_EDGE_PROXIES=10.1.2.50/32
PAYLINK_TRUSTED_PROXIES=172.16.0.0/12,127.0.0.0/8,10.1.2.50/32

# Where links and the gateway return URL point, if customers pay from outside.
PAYLINK_PUBLIC_BASE_URL=https://share.zemenbank.com/paybylinkapi
PAYLINK_CORS_ORIGINS=https://share.zemenbank.com,https://10.1.2.136:2000
```

Then `docker compose -f docker-compose.prod.yml up -d --build`.

### The three that are not obvious

**The API signature covers the path.** An integrator signs
`/paybylinkapi/api/v1/...` — the address they called — and we are handed the
path with the prefix already removed. Without `PAYLINK_PUBLIC_PATH_PREFIX` the
two never match and every public call is refused as `signature_invalid`, which
sends people hunting through their HMAC code for a fault that is not there.

**The proxy's address is needed in two places, and they do different things.**
`PAYLINK_EDGE_PROXIES` tells Caddy to keep the forwarded chain instead of
replacing it; `PAYLINK_TRUSTED_PROXIES` tells the API how far along that chain
to believe. Miss the first and the chain is thrown away at the door. Miss the
second and every public caller is attributed to the proxy — one shared
rate-limit bucket, where a single abusive caller exhausts the budget for
everybody and a lockout lands on the wrong identity.

**`PAYLINK_TRUSTED_PROXIES` must name proxies and nothing else.** The API walks
the forwarded chain from the right, past every address listed there, and calls
the first one it did not put there the client. List a whole LAN range and the
clients inside it are walked past too — any of them can then prepend an address
and be attributed to it, which is every rate limit and lockout undone at once.
This is why the default no longer includes `10.0.0.0/8` and `192.168.0.0/16`.
**An existing deployment should narrow it.**

### If customers pay from outside, not just integrators

The API works under a prefix. The pages a customer opens do not, unless the
proxy is set up for it — a browser asks for `/_next/...` at the proxy's root,
which is not routed here, and the payment page arrives with no styling and no
JavaScript.

Two ways round it, and the choice is the proxy team's:

- **A dedicated hostname** — `pay.zemenbank.com` forwarded whole, no path
  prefix. Nothing else to configure; set `PAYLINK_PUBLIC_BASE_URL` to it.
- **Keep the prefix on the way through**, and build the image with
  `PAYLINK_BASE_PATH=/paybylinkapi` so Next emits its assets under that path.
  It is baked in at build time, so changing it means rebuilding.

## Letting another system create links

A third-party system — a fundraising platform, a billing system — can create
payment links through the API instead of anyone opening the portal.

The full guide, which is what you hand the integrator, is **[INTEGRATION.md](INTEGRATION.md)**.
The short version of what happens on this server:

```bash
cd /opt/paylink

# an integrator account, against a merchant already in the register
docker compose -f docker-compose.prod.yml exec api /paylinkadm integrator \
  -username zcare -merchant 600123456789 -name "Z-Care Platform"

# their test integration and its credentials, shown once
docker compose -f docker-compose.prod.yml exec api /paylinkadm integration \
  -username zcare -name "Z-Care" -webhook https://z-care.et/hooks/paylink

docker compose -f docker-compose.prod.yml exec api /paylinkadm list
```

Between those two steps the integrator signs in once, sets recovery questions,
and connects the MPGS gateway their links will settle against — without it,
link creation is refused, because there would be no gateway to take the money.

**Test credentials only.** Live ones are the outcome of a review, never of a
command: somebody looks at the merchant and at what its test traffic actually
did, and only then does `approve-live` issue a live key. Asking to go live
without a single test payment is refused, because there would be nothing to
review.

## Looking at the data from another machine

MySQL is not published. Nothing outside the compose network can reach it, and
that is worth keeping — it is the payment record.

To browse it in a GUI client, tunnel to it over SSH rather than opening the
port to the LAN:

```bash
# on the server — publishes 3306 on its own loopback, not on the network
docker compose -f docker-compose.prod.yml -f docker-compose.dbaccess.yml up -d db

# creates a read-only account and prints the connection details
bash scripts/db-viewer.sh
```

Then from your PC:

```bash
ssh -N -L 3307:127.0.0.1:3306 user@10.1.2.136
```

and point DBeaver, MySQL Workbench or HeidiSQL at `127.0.0.1:3307`, database
`paylink`, using the read-only account the script issued. All three can open
the tunnel themselves instead, which saves leaving a terminal running.

When you are done, close it again:

```bash
docker compose -f docker-compose.prod.yml up -d db
```

**Use the read-only account, not root.** Browsing live payments in a grid
editor with an account that can write is one mis-click from altering a row
nobody can reconstruct — and a payment that quietly changed is worse than one
that is missing, because nothing looks wrong afterwards.

**Do not publish 3306 to the network.** `"3306:3306"` instead of
`"127.0.0.1:3306:3306"` puts the payment database in front of every machine in
the bank with one password between them and it. The tunnel costs one extra
command and needs an SSH account to get through.

## Backups

Nothing else backs up your data.

```bash
bash scripts/backup.sh          # → backups/paylink-<timestamp>.sql.gz
```

It verifies the archive and checks the dump reached its end marker before
deleting anything older, so a half-written dump never replaces a good one.

```bash
crontab -e
15 2 * * * cd /opt/paylink && bash scripts/backup.sh >> backups/backup.log 2>&1
```

**A database backup on its own cannot restore this system.** Operator MPGS
passwords are sealed with `PAYLINK_ENCRYPTION_KEY` from `.env.production`. Lose
the key and the dump restores everything except the ability to take a payment —
every operator has to reconnect their gateway. Keep a copy of that key somewhere
the backups are not.

### Restoring

```bash
zcat backups/paylink-<timestamp>.sql.gz | \
  docker compose -f docker-compose.prod.yml exec -T db \
  sh -c 'exec mysql -uroot -p"$MYSQL_ROOT_PASSWORD"'
docker compose -f docker-compose.prod.yml restart api
```

Test this once, on purpose, before you need it.

## Updating

Copy a fresh bundle over the top, then:

```bash
cd /opt/paylink
docker compose -f docker-compose.prod.yml up -d --build
```

`.env.production` is not in the bundle, so your secrets survive the overwrite.

A restart signs everyone out — sessions, channel keys and lockouts live in
memory. Do it outside trading hours.

## Things that will bite

**Do not run more than one copy.** The same in-memory state means two instances
disagree: a request signed against one is refused by the other, and lockouts are
not shared. Keep it to a single replica.

**Do not widen `PAYLINK_TRUSTED_PROXIES`.** It decides whose `X-Forwarded-For`
is believed, and therefore who a rate limit and a lockout apply to. Trust too
broadly and a caller picks their own identity — every control still runs and
none of them does anything.

**Never change `PAYLINK_ENCRYPTION_KEY` after go-live.** Every stored gateway
credential becomes unreadable.

**MySQL ignores `MYSQL_PASSWORD` if its data directory already exists.** It is
only applied when the database is first initialised. To change it afterwards,
`ALTER USER` inside the container — editing the env file alone will just stop
the API connecting.

**ICMP is blocked on this network.** `ping` fails to hosts that are perfectly
reachable, so it proves nothing either way. Test with a TCP connection instead:

```bash
timeout 10 bash -c 'exec 3<>/dev/tcp/test-gateway.mastercard.com/443' \
  && echo reachable || echo blocked
```

## Troubleshooting

```bash
docker compose -f docker-compose.prod.yml ps            # what is running
docker compose -f docker-compose.prod.yml logs -f api   # the API
docker compose -f docker-compose.prod.yml logs caddy    # certificates
curl -k https://localhost:2000/healthz                  # is the API answering
```

**"required variable MYSQL_PASSWORD is missing a value"** does not mean the
stack is broken — it is usually running perfectly. Compose only reads a file
literally named `.env` when it expands `${...}` inside the compose file, and
the secrets live in `.env.production`. The installer links the two names; if
that link is missing, recreate it:

```bash
cd /opt/paylink && ln -s .env.production .env
```

Or pass `--env-file .env.production` on every command.

Page does not load, in the order worth checking:

1. does the address resolve to this server? `dig +short <hostname>`
2. is port 2000 open? `sudo ufw status`
3. is Caddy holding the port? `sudo ss -tlnp | grep 2000`
4. `docker compose -f docker-compose.prod.yml logs caddy` — certificate
   trouble shows here
