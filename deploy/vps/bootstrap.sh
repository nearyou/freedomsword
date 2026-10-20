#!/usr/bin/env bash
set -euo pipefail

if [[ ${EUID} -ne 0 ]]; then
  echo 'Run as root: sudo bash deploy/vps/bootstrap.sh' >&2
  exit 1
fi

repo_dir=$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd -P)
node_bin=$(readlink -f "$(command -v node)")
if [[ ${node_bin} == /root/* || ! -x ${node_bin} ]]; then
  echo 'Install Node.js 22.12+ system-wide before running this script; a /root-only Node binary cannot run as the service user.' >&2
  exit 1
fi
read -r node_major node_minor <<< "$("${node_bin}" -p 'process.versions.node.split(".").slice(0, 2).join(" ")')"
if (( node_major < 22 || (node_major == 22 && node_minor < 12) )); then
  echo 'Node.js 22.12+ is required.' >&2
  exit 1
fi

apt-get update
apt-get install -y ca-certificates curl gnupg debian-keyring debian-archive-keyring apt-transport-https iproute2 redis-server
if ! command -v caddy >/dev/null 2>&1; then
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' |
    gpg --dearmor --yes -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' \
    > /etc/apt/sources.list.d/caddy-stable.list
  chmod o+r /usr/share/keyrings/caddy-stable-archive-keyring.gpg /etc/apt/sources.list.d/caddy-stable.list
  apt-get update
  apt-get install -y caddy
fi

if ! id -u freedomsword >/dev/null 2>&1; then
  useradd --system --home-dir /opt/freedomsword --shell /usr/sbin/nologin freedomsword
fi
install -d -m 755 -o freedomsword -g freedomsword /opt/freedomsword /opt/freedomsword/releases
if ! runuser -u freedomsword -- test -x "${node_bin}"; then
  echo "The freedomsword service user cannot execute ${node_bin}; install Node.js system-wide." >&2
  exit 1
fi

cat > /etc/systemd/system/freedomsword-api.service <<EOF
[Unit]
Description=FreedomSword API
Wants=network-online.target redis-server.service
After=network-online.target redis-server.service

[Service]
User=freedomsword
Group=freedomsword
WorkingDirectory=/opt/freedomsword/current/backend
EnvironmentFile=/opt/freedomsword/current/backend/.env
ExecStart=${node_bin} /opt/freedomsword/current/backend/dist/server.js
Restart=always
RestartSec=3
NoNewPrivileges=true
PrivateTmp=true
ProtectHome=true
ProtectSystem=full

[Install]
WantedBy=multi-user.target
EOF

cat > /etc/systemd/system/freedomsword-frontend.service <<EOF
[Unit]
Description=FreedomSword frontend
Wants=network-online.target
After=network-online.target

[Service]
User=freedomsword
Group=freedomsword
WorkingDirectory=/opt/freedomsword/current/frontend
Environment=NODE_ENV=production
Environment=APP_ENV=production
Environment=BACKEND_URL=http://127.0.0.1:3001
ExecStart=${node_bin} /opt/freedomsword/current/node_modules/next/dist/bin/next start -H 127.0.0.1 -p 3000
Restart=always
RestartSec=3
NoNewPrivileges=true
PrivateTmp=true
ProtectHome=true
ProtectSystem=full

[Install]
WantedBy=multi-user.target
EOF

cat > /etc/systemd/system/freedomsword-worker.service <<EOF
[Unit]
Description=FreedomSword blockchain outbox worker
Wants=network-online.target redis-server.service
After=network-online.target redis-server.service

[Service]
User=freedomsword
Group=freedomsword
WorkingDirectory=/opt/freedomsword/current/backend
EnvironmentFile=/opt/freedomsword/current/backend/.env
ExecStart=${node_bin} /opt/freedomsword/current/backend/dist/outbox-worker.js
Restart=always
RestartSec=3
NoNewPrivileges=true
PrivateTmp=true
ProtectHome=true
ProtectSystem=full

[Install]
WantedBy=multi-user.target
EOF

systemd-analyze verify /etc/systemd/system/freedomsword-{api,frontend,worker}.service
systemctl daemon-reload
systemctl enable --now redis-server
redis-cli -h 127.0.0.1 ping | grep -qx PONG
if ss -H -ltn '( sport = :6379 )' | awk '{print $4}' |
  grep -Ev '^(127\.0\.0\.1|\[::1\]|::1):6379$' | grep -q .; then
  echo 'Redis is listening on a public address. Bind it to loopback before proceeding.' >&2
  exit 1
fi

if [[ -f /etc/caddy/Caddyfile ]]; then
  cp /etc/caddy/Caddyfile "/etc/caddy/Caddyfile.before-freedomsword.$(date +%Y%m%d%H%M%S)"
fi
install -m 644 "${repo_dir}/deploy/vps/Caddyfile" /etc/caddy/Caddyfile
caddy validate --config /etc/caddy/Caddyfile
systemctl enable --now caddy
systemctl reload caddy

echo 'Bootstrap complete. Set backend/.env, then run: sudo bash deploy/vps/deploy.sh'
