#!/usr/bin/env bash
set -euo pipefail
if [[ ${EUID} -ne 0 ]]; then
  echo 'Run as root: sudo bash deploy/vps/install-feedback.sh' >&2
  exit 1
fi
node_bin=$(readlink -f "$(command -v node)")
env -i PATH="${PATH}" "${node_bin}" --env-file=/opt/freedomsword/current/backend/.env -e '
if (!process.env.FEEDBACK_BOT_TOKEN || !/^-?\d+$/.test(process.env.FEEDBACK_CHAT_ID || "") ||
    process.env.FEEDBACK_BOT_TOKEN === process.env.TELEGRAM_BOT_TOKEN ||
    process.env.FEEDBACK_STATE_FILE !== "/opt/freedomsword/feedback/state.json")
  throw Error("Configure the separate feedback bot, team chat ID and persistent state file first");
'
install -d -m 700 -o freedomsword -g freedomsword /opt/freedomsword/feedback
cat > /etc/systemd/system/freedomsword-feedback.service <<EOF
[Unit]
Description=FreedomSword separate feedback bot
Wants=network-online.target
After=network-online.target

[Service]
User=freedomsword
Group=freedomsword
WorkingDirectory=/opt/freedomsword/current/backend
EnvironmentFile=/opt/freedomsword/current/backend/.env
ExecStart=${node_bin} /opt/freedomsword/current/backend/scripts/feedback-bot.mjs
Restart=always
RestartSec=5
TimeoutStopSec=45
NoNewPrivileges=true
PrivateTmp=true
ProtectHome=true
ProtectSystem=strict
ReadWritePaths=/opt/freedomsword/feedback

[Install]
WantedBy=multi-user.target
EOF
systemd-analyze verify /etc/systemd/system/freedomsword-feedback.service
systemctl daemon-reload
systemctl enable --now freedomsword-feedback
systemctl is-active --quiet freedomsword-feedback
echo 'FreedomSword feedback bot service is active.'
