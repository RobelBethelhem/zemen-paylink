#!/usr/bin/env bash
# Prepares a fresh Oracle Cloud instance to run the stack.
#
# Oracle's images ship with a host firewall that drops everything except SSH,
# and it is separate from the security list you edit in the console. Opening
# ports in one and not the other is the single most common reason a new OCI
# instance looks unreachable — so this does the host side and reminds you about
# the console side.
#
#   curl -fsSL https://raw.githubusercontent.com/<you>/paylink/main/scripts/oracle-setup.sh | bash
# or, from a clone:
#   bash scripts/oracle-setup.sh
set -euo pipefail

echo "==> architecture: $(uname -m)"

install_docker() {
  if command -v docker >/dev/null 2>&1; then
    echo "==> docker already installed"
    return
  fi
  echo "==> installing docker"
  if command -v apt-get >/dev/null 2>&1; then
    sudo apt-get update -y
    sudo apt-get install -y docker.io docker-compose-plugin
  elif command -v dnf >/dev/null 2>&1; then
    sudo dnf install -y dnf-utils
    sudo dnf config-manager --add-repo=https://download.docker.com/linux/centos/docker-ce.repo
    sudo dnf install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
  else
    echo "!! unsupported distribution; install docker manually" >&2
    exit 1
  fi
  sudo systemctl enable --now docker
  sudo usermod -aG docker "$USER"
  echo "==> added $USER to the docker group — log out and back in for it to apply"
}

open_ports() {
  echo "==> opening 80 and 443 on the host firewall"
  if command -v firewall-cmd >/dev/null 2>&1 && sudo firewall-cmd --state >/dev/null 2>&1; then
    # Oracle Linux
    sudo firewall-cmd --permanent --add-service=http
    sudo firewall-cmd --permanent --add-service=https
    sudo firewall-cmd --reload
    echo "==> firewalld updated"
  else
    # Ubuntu images on OCI: iptables with a REJECT at the end of INPUT, so the
    # new rules have to go in front of it rather than being appended.
    for port in 80 443; do
      if ! sudo iptables -C INPUT -p tcp --dport "$port" -j ACCEPT 2>/dev/null; then
        sudo iptables -I INPUT 1 -p tcp --dport "$port" -m conntrack --ctstate NEW -j ACCEPT
      fi
    done
    if command -v netfilter-persistent >/dev/null 2>&1; then
      sudo netfilter-persistent save
    else
      sudo apt-get install -y iptables-persistent
    fi
    echo "==> iptables updated and saved"
  fi
}

install_docker
open_ports

cat <<'NEXT'

==> host is ready.

   Still to do in the Oracle console — the host firewall is only half of it:

     Networking → Virtual Cloud Networks → your VCN → Security Lists
       → Add Ingress Rules

       Source 0.0.0.0/0   TCP   destination port 80
       Source 0.0.0.0/0   TCP   destination port 443

   Then point an A record for your API domain at this instance's public IP and
   wait for it to resolve before starting the stack — Caddy asks Let's Encrypt
   for a certificate on first run, and that fails if the name does not yet
   answer.

     dig +short api.yourdomain.et

NEXT
