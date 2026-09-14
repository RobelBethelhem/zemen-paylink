#!/usr/bin/env bash
# Creates a read-only database account for browsing the data in a GUI client,
# and prints how to reach it.
#
# Read-only deliberately. Browsing live payment records with an account that
# can UPDATE or DELETE is one mis-click in a grid editor away from altering a
# row nobody can reconstruct — and a payment that quietly changed is worse than
# one that is missing, because nothing looks wrong.
#
# Safe to re-run: it rotates the password rather than failing.
set -euo pipefail

cd "$(dirname "$0")/.."
ENV_FILE=.env.production
COMPOSE=(docker compose -f docker-compose.prod.yml --env-file "$ENV_FILE")

say()  { printf '\n\033[1m==> %s\033[0m\n' "$*"; }
warn() { printf '\033[33m !! %s\033[0m\n' "$*"; }
die()  { printf '\033[31m !! %s\033[0m\n' "$*" >&2; exit 1; }

[ -f "$ENV_FILE" ] || die "$ENV_FILE not found — run scripts/install.sh first"

ROOT_PW=$(grep '^MYSQL_ROOT_PASSWORD=' "$ENV_FILE" | cut -d= -f2-)
[ -n "$ROOT_PW" ] || die "MYSQL_ROOT_PASSWORD is not set in $ENV_FILE"

"${COMPOSE[@]}" ps --status running --services 2>/dev/null | grep -qx db \
  || die "the database is not running. Start it: ${COMPOSE[*]} up -d db"

VIEWER_USER=paylink_ro
VIEWER_PW=$(openssl rand -base64 18 | tr -d '/@" ')

say "Creating the read-only account"
# Host '%' rather than localhost: through a published port the connection
# arrives from the Docker bridge, not from inside the container. The account is
# SELECT-only and the port is bound to loopback, so this grants no reach.
"${COMPOSE[@]}" exec -T db sh -c "exec mysql -uroot -p'$ROOT_PW'" <<SQL
CREATE USER IF NOT EXISTS '$VIEWER_USER'@'%' IDENTIFIED BY '$VIEWER_PW';
ALTER USER '$VIEWER_USER'@'%' IDENTIFIED BY '$VIEWER_PW';
REVOKE ALL PRIVILEGES, GRANT OPTION FROM '$VIEWER_USER'@'%';
GRANT SELECT ON paylink.* TO '$VIEWER_USER'@'%';
FLUSH PRIVILEGES;
SQL
echo "    $VIEWER_USER can read the paylink database and change nothing"

# Is the port published for a tunnel to land on?
if "${COMPOSE[@]}" port db 3306 >/dev/null 2>&1; then
  BOUND=$("${COMPOSE[@]}" port db 3306 2>/dev/null | head -1)
  case "$BOUND" in
    127.0.0.1:*) echo "    port published on $BOUND (loopback only — correct)" ;;
    *)           warn "port published on $BOUND — that is reachable from the network."
                 warn "Expected 127.0.0.1:3306. Check docker-compose.dbaccess.yml." ;;
  esac
else
  warn "MySQL is not published, so an SSH tunnel has nothing to connect to."
  warn "Open it on the server's loopback with:"
  warn "  docker compose -f docker-compose.prod.yml -f docker-compose.dbaccess.yml up -d db"
fi

SERVER=$(grep '^PAYLINK_HOSTNAME=' "$ENV_FILE" | cut -d= -f2-)

cat <<DONE

==> Connect from your PC

    Everything below assumes an SSH tunnel. Nothing is exposed to the network.

    1. Open the tunnel (leave this window running):

         ssh -N -L 3307:127.0.0.1:3306 $USER@${SERVER:-<server>}

    2. Point your client at the near end of the tunnel:

         Host      127.0.0.1
         Port      3307
         Database  paylink
         User      $VIEWER_USER
         Password  $VIEWER_PW

    DBeaver, MySQL Workbench and HeidiSQL can all open the tunnel themselves
    instead of step 1 — set SSH host $SERVER, and the MySQL host 127.0.0.1
    port 3306 as seen from the server.

    The password above is shown once. Re-run this script to issue a new one.
    To close network access again when you are done:

         docker compose -f docker-compose.prod.yml up -d db

DONE
