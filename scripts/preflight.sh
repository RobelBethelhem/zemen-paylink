#!/usr/bin/env bash
# Run this before scripts/install.sh.
#
# It checks the things that actually stop an install on a bank network, and
# pulls the base images up front with retries — so a dropped TLS handshake
# costs one retry here rather than failing a build several minutes in.
#
# It changes nothing and starts nothing. Read-only apart from the image cache.
set -uo pipefail

cd "$(dirname "$0")/.."

PORT=${PAYLINK_PORT:-2000}
FAILED=0

say()  { printf '\n\033[1m==> %s\033[0m\n' "$*"; }
ok()   { printf '    \033[32mok\033[0m    %s\n' "$*"; }
bad()  { printf '    \033[31mFAIL\033[0m  %s\n' "$*"; FAILED=1; }
warn() { printf '    \033[33mwarn\033[0m  %s\n' "$*"; }

# ---------------------------------------------------------------- tools

say "Tools"
for tool in docker openssl; do
  if command -v "$tool" >/dev/null 2>&1; then
    ok "$tool"
  else
    bad "$tool is missing — sudo apt install -y $tool"
  fi
done
if docker compose version >/dev/null 2>&1; then
  ok "docker compose plugin"
else
  bad "docker compose plugin missing — sudo apt install -y docker-compose-plugin"
fi
if docker info >/dev/null 2>&1; then
  ok "docker daemon reachable as $(id -un)"
else
  bad "cannot talk to the docker daemon — sudo usermod -aG docker $USER && newgrp docker"
fi

# ---------------------------------------------------------------- neighbours

say "What is already running on this host (none of it will be touched)"
docker ps --format '    {{.Names}}\t{{.Image}}\t{{.Ports}}' 2>/dev/null || true

say "Port $PORT"
if command -v ss >/dev/null 2>&1 && ss -tln 2>/dev/null | grep -qE "[:.]$PORT[[:space:]]"; then
  bad "port $PORT is already in use — pick another and pass PAYLINK_PORT=<n>"
else
  ok "port $PORT is free"
fi

# ---------------------------------------------------------------- egress
#
# Deliberately not ping: ICMP is blocked on this network, so a ping proves
# nothing either way. What matters is whether a TCP session to 443 opens.

tcp() {
  host=$1; port=${2:-443}
  timeout 15 bash -c "exec 3<>/dev/tcp/$host/$port" 2>/dev/null
}

say "Outbound HTTPS (TCP 443)"
for host in registry-1.docker.io auth.docker.io production.cloudflare.docker.com \
            proxy.golang.org registry.npmjs.org gcr.io \
            github.com codeload.github.com; do
  if tcp "$host"; then ok "$host"; else bad "$host"; fi
done

say "Mastercard gateway — without this, no payment can be taken"
for host in test-gateway.mastercard.com ap-gateway.mastercard.com; do
  if ! tcp "$host"; then
    bad "$host — ask the firewall team to allow outbound 443 to it"
    continue
  fi
  if command -v curl >/dev/null 2>&1; then
    code=$(curl -sS -o /dev/null -w '%{http_code}' --connect-timeout 20 --max-time 60 \
             "https://$host/api/rest/version/100/information" 2>/dev/null)
    case "$code" in
      000) bad "$host accepts TCP but the TLS/HTTP request failed — inspecting proxy?" ;;
      *)   ok  "$host answered HTTP $code" ;;
    esac
  else
    ok "$host (TCP only; install curl for a fuller check)"
  fi
done

# ---------------------------------------------------------------- images

say "Pulling base images (retried — the link here drops handshakes)"
pull() {
  image=$1
  for attempt in 1 2 3 4 5; do
    if docker pull "$image" >/dev/null 2>&1; then
      ok "$image"
      return 0
    fi
    printf '          attempt %d failed, retrying\n' "$attempt"
    sleep $((attempt * 5))
  done
  bad "could not pull $image after five attempts"
  return 1
}
for image in golang:1.25-alpine \
             gcr.io/distroless/static-debian12:nonroot \
             node:22-alpine \
             mysql:8.4 \
             caddy:2-alpine; do
  pull "$image"
done

# ---------------------------------------------------------------- verdict

say "Result"
if [ "$FAILED" -eq 0 ]; then
  printf '    \033[32mReady.\033[0m Next:  bash scripts/install.sh\n\n'
else
  printf '    \033[31mNot ready.\033[0m Fix what is marked FAIL above first.\n'
  printf '    A gateway failure alone still lets you install and sign in —\n'
  printf '    you just cannot take a payment until egress is allowed.\n\n'
  exit 1
fi
