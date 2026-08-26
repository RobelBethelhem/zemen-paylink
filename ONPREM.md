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

## Sharing a host with other stacks

This compose project is named `paylink`, so its containers, network and volumes
never collide with anything else on the box. Two rules keep it that way:

- **Always pass `-f docker-compose.prod.yml`.** A bare `docker compose` command
  in this directory picks up the development file instead.
- **Never run `docker system prune`** on a shared host. It removes other
  stacks' unused images and volumes too.

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

Page does not load, in the order worth checking:

1. does the address resolve to this server? `dig +short <hostname>`
2. is port 2000 open? `sudo ufw status`
3. is Caddy holding the port? `sudo ss -tlnp | grep 2000`
4. `docker compose -f docker-compose.prod.yml logs caddy` — certificate
   trouble shows here
