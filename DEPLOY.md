# Deploying

Frontend on Vercel, backend and MySQL on one small server. The portal proxies
`/api/v1/*` to the backend, so the browser only ever talks to one origin — no
CORS, and the sealed channel's origin check passes without special handling.

## Before you start

**A domain for the API is a hard requirement.** Browsers only expose WebCrypto —
and therefore the sealed channel the API insists on — to a secure context, and
Vercel will not proxy to an upstream whose certificate it cannot verify. Plain
HTTP would also put every `Authorization` header in the clear: the sealed
channel encrypts payloads, not headers.

A subdomain of a domain you own is ideal (`api.zemenbank.et`). A free DuckDNS
subdomain works for a pilot.

**One instance only.** Secure-channel keys, the session registry, rate limiters
and lockouts are held in memory. Two instances and a request signed against one
is refused by the other. Do not put this behind an autoscaler.

## Option A — Railway (no credit card, ~20 minutes)

Railway gives you HTTPS and a domain automatically, so there is no certificate
to obtain and no Caddy — the two hardest parts of the self-hosted path
disappear. The trial is **$5 of credit over 30 days with no card**.

Be clear about what that buys: this stack is roughly **$6–8/month** running
continuously (MySQL ~0.5 GB, the API ~0.1 GB, at $10/GB/month), so the trial
covers about three weeks. The ongoing free plan's $1/month covers about four
days. It is a runway, not a home.

### 1. The database

New Project → **Add MySQL**. Railway provisions it with a volume and exposes
`MYSQL_PRIVATE_URL`.

### 2. The API

**Add Service → GitHub repo**, then in the service settings:

- **Root Directory**: `api`
- Build is picked up from `api/railway.json` → the Dockerfile

Variables → Raw Editor → paste `.env.railway.example` and fill it in. Note the
first line references Railway's own MySQL service rather than copying its
password, so a rotated credential follows automatically:

```
PAYLINK_DATABASE=${{MySQL.MYSQL_PRIVATE_URL}}
```

Generate the two secrets — do not invent them:

```bash
openssl rand -base64 48   # PAYLINK_JWT_SECRET
openssl rand -base64 32   # PAYLINK_ENCRYPTION_KEY   ← back this up
```

Then **Settings → Networking → Generate Domain**. That is your API URL.

Do not set `PAYLINK_ADDR`: Railway injects `PORT` and the service binds it.

### 3. Vercel

Import the repo, root directory `web`, one variable:

```
PAYLINK_API_UPSTREAM = https://<your-service>.up.railway.app
```

Deploy, then put the Vercel URL back into Railway as `PAYLINK_PUBLIC_BASE_URL`
and `PAYLINK_CORS_ORIGINS` and redeploy the API. That value is what pay links
and the gateway's return URL are built from, so it has to be the address
customers actually open — not the API's.

### Railway-specific things that bite

- **`PAYLINK_TRUSTED_PROXIES` must include `fd00::/8`.** Railway's private
  network is IPv6. Without it, every rate limit and lockout is attributed to
  Railway's proxy instead of the caller — the controls run and do nothing.
- **MySQL in 0.5 GB** is tight once the trial's 1 GB allowance ends. If it gets
  killed, lower `innodb_buffer_pool_size` to 64M.
- **Do not enable app sleeping.** It brings back a cold start on every payment
  link and drops every operator session, which live in memory.

---

## Option B — your own server (Oracle, Hetzner, or Zemen infrastructure)

Uses `docker-compose.prod.yml` and the `Caddyfile`, which bring their own TLS.
This is where a bank's payment portal belongs once real merchants are on it.

### 1. The server — Oracle Cloud Always Free

Every image in the stack is multi-arch, so Oracle's Ampere A1 (ARM) runs it
unchanged.

**Creating the instance**

1. Sign up at cloud.oracle.com. **The home region is permanent** — pick one near
   Ethiopia before creating anything. Jeddah, Dubai or Frankfurt.
2. Compute → Instances → Create.
   - Image: **Ubuntu 22.04** (or Oracle Linux 9)
   - Shape: **VM.Standard.A1.Flex**, **2 OCPU / 12 GB** — the Always Free
     allowance was halved in June 2026, and an instance over it gets terminated
   - Add your SSH public key. There is no password login.
3. **"Out of host capacity" is normal.** Ampere is heavily subscribed. Try the
   other availability domains, then retry over a few hours — it does come free.
   If you cannot get one, `VM.Standard.E2.1.Micro` is also always-free but has
   1 GB of RAM, which MySQL will struggle with; prefer waiting for ARM.

**Preparing it**

```bash
ssh ubuntu@<public-ip>
git clone <your repo> paylink && cd paylink
bash scripts/oracle-setup.sh          # docker + host firewall
exit && ssh ubuntu@<public-ip>        # so the docker group applies
```

**Both firewalls, not one.** Oracle instances have a host firewall *and* a VCN
security list, and opening only one is the usual reason a new instance looks
dead. The script does the host side; do the console side:

> Networking → Virtual Cloud Networks → your VCN → Security Lists →
> Add Ingress Rules: `0.0.0.0/0` TCP port **80**, and again for **443**.

**The domain.** Point an A record at the instance's public IP and wait for it to
resolve *before* starting the stack — Caddy requests a certificate on first run
and that fails if the name does not answer yet.

```bash
dig +short api.yourdomain.et    # must return your instance IP
```

No domain? A free DuckDNS subdomain works for a pilot.

**Configuring**

```bash
cp .env.production.example .env.production
chmod 600 .env.production
nano .env.production
```

Fill it in. Generate the secrets, do not invent them:

```bash
openssl rand -base64 24   # MYSQL_PASSWORD, MYSQL_ROOT_PASSWORD
openssl rand -base64 48   # PAYLINK_JWT_SECRET
openssl rand -base64 32   # PAYLINK_ENCRYPTION_KEY  ← back this up
```

Then bring it up:

```bash
docker compose -f docker-compose.prod.yml up -d --build
docker compose -f docker-compose.prod.yml logs -f api
```

Caddy obtains a certificate on its own. Confirm:

```bash
curl https://api.yourdomain.et/healthz
```

The startup log prints the merchant-management password **once** if you did not
set `PAYLINK_BOOTSTRAP_PASSWORD`. Record it there and then.

## 2. Vercel

Import the repository, set the root directory to `web`, and add one environment
variable:

```
PAYLINK_API_UPSTREAM = https://api.yourdomain.et
```

Set the function region to the one nearest your server — otherwise every API
call crosses an ocean twice. Deploy, then put the Vercel URL back into
`.env.production` as `PAYLINK_PUBLIC_BASE_URL` and `PAYLINK_CORS_ORIGINS`, and
restart the API. It is what pay links and the gateway's return URL are built
from, so it has to be the address customers actually open.

```bash
docker compose -f docker-compose.prod.yml up -d api
```

## 3. First run

1. Sign in as `management` with the bootstrap password. **Change it.**
2. Register your merchant number and the name it trades under. That name is
   what appears on customers' receipts.
3. Have an operator register against that number, then connect their gateway —
   test first, live when EVO issues production credentials.
4. Create a link, pay it with a test card, refund it. Then look at the receipt.

## Things that will bite

**`PAYLINK_ENCRYPTION_KEY` is not rotatable.** Change it and every stored MPGS
credential becomes unreadable; every operator reconnects. Back it up somewhere
the database backup is not — together they are the whole system.

**`PAYLINK_ENV=production` refuses to start** if any account still holds the
demo password from the README. That is deliberate.

**A restart signs everyone out**, because sessions live in memory. Redeploy
outside trading hours.

**Back up the database.** Nothing else does.

```bash
# nightly, keeping 14 days
docker compose -f docker-compose.prod.yml exec -T db \
  mysqldump -uroot -p"$MYSQL_ROOT_PASSWORD" --single-transaction paylink \
  | gzip > "backup-$(date +%F).sql.gz"
```

**Coming from the SQLite build**, copy the data across before going live:

```bash
go run ./cmd/sqlite2mysql -sqlite paylink.db -mysql "paylink:PASS@tcp(127.0.0.1:3306)/paylink"
```

## Updating

```bash
git pull
docker compose -f docker-compose.prod.yml up -d --build api
```
