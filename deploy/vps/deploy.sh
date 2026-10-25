#!/usr/bin/env bash
set -euo pipefail

if [[ ${EUID} -ne 0 ]]; then
  echo 'Run as root: sudo bash deploy/vps/deploy.sh' >&2
  exit 1
fi

repo_dir=$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd -P)
base_dir=/opt/freedomsword
env_file=${repo_dir}/backend/.env
if [[ ! -f ${env_file} ]]; then
  echo "Missing ${env_file}; copy backend/.env.example and fill in the VPS settings." >&2
  exit 1
fi
if [[ ! -f /etc/systemd/system/freedomsword-api.service ]]; then
  echo 'Run deploy/vps/bootstrap.sh first.' >&2
  exit 1
fi
if [[ -n $(git -C "${repo_dir}" status --porcelain) ]]; then
  echo 'Commit or remove untracked project changes before deploying; this script archives HEAD.' >&2
  exit 1
fi

env -i PATH="${PATH}" node --env-file="${env_file}" -e '
const expected = {
  NODE_ENV: "production",
  APP_ORIGIN: "https://freedomsword.org",
  HOST: "127.0.0.1",
  PORT: "3001",
  TELEGRAM_AUTH_ENABLED: "true",
  ALLOW_DEMO_AUTH: "false",
  RATE_LIMIT_BACKEND: "redis",
  REDIS_URL: "redis://127.0.0.1:6379",
  OUTBOX_PROCESSING: "worker",
};
for (const [key, value] of Object.entries(expected)) {
  if (process.env[key] !== value) throw Error(`${key} must equal ${value}`);
}
if (!["staging", "production"].includes(process.env.APP_ENV))
  throw Error("APP_ENV must be staging or production");
'

for entry in '3000 freedomsword-frontend' '3001 freedomsword-api'; do
  read -r port service <<< "${entry}"
  if ! systemctl is-active --quiet "${service}" &&
    ss -H -ltn "( sport = :${port} )" | grep -q .; then
    echo "Port ${port} is in use. Stop the foreground process before deploying." >&2
    exit 1
  fi
done

release_dir=$(mktemp -d "${base_dir}/releases/release.XXXXXXXX")
git -C "${repo_dir}" archive --format=tar HEAD | tar -xf - -C "${release_dir}"
install -m 600 -o freedomsword -g freedomsword "${env_file}" "${release_dir}/backend/.env"
chown -R freedomsword:freedomsword "${release_dir}"

(
  cd "${release_dir}"
  runuser -u freedomsword -- env HOME="${base_dir}" npm ci --include=dev
  runuser -u freedomsword -- env -i HOME="${base_dir}" PATH="${PATH}" \
    node --env-file=backend/.env --import tsx --input-type=module \
    -e "import { loadConfig } from './backend/src/config.ts'; loadConfig();"
  runuser -u freedomsword -- env HOME="${base_dir}" npm run build -w @freedomsword/backend
  runuser -u freedomsword -- env HOME="${base_dir}" NODE_ENV=production APP_ENV=production \
    BACKEND_URL=http://127.0.0.1:3001 npm run build -w @freedomsword/frontend
)

previous_release=''
if [[ -L ${base_dir}/current ]]; then
  previous_release=$(readlink -f "${base_dir}/current")
fi
ln -sfnT "${release_dir}" "${base_dir}/current.next"
mv -Tf "${base_dir}/current.next" "${base_dir}/current"
systemctl enable freedomsword-api freedomsword-frontend freedomsword-worker
restart_ok=true
if ! systemctl restart freedomsword-api freedomsword-frontend freedomsword-worker; then
  restart_ok=false
fi

ready=false
if [[ ${restart_ok} == true ]]; then
  for _ in $(seq 1 20); do
    if curl -fsS --max-time 5 http://127.0.0.1:3001/api/ready >/dev/null &&
      curl -fsS --max-time 5 -o /dev/null http://127.0.0.1:3000/ &&
      systemctl is-active --quiet freedomsword-worker; then
      ready=true
      break
    fi
    sleep 2
  done
fi

if [[ ${ready} != true ]]; then
  if [[ -n ${previous_release} ]]; then
    ln -sfnT "${previous_release}" "${base_dir}/current.next"
    mv -Tf "${base_dir}/current.next" "${base_dir}/current"
    systemctl restart freedomsword-api freedomsword-frontend freedomsword-worker || true
    echo 'Local health check failed; restored the previous release.' >&2
  else
    echo 'Local health check failed on the first release.' >&2
  fi
  echo 'Inspect: journalctl -u freedomsword-api -u freedomsword-frontend -u freedomsword-worker -n 80 --no-pager' >&2
  exit 1
fi

echo "Running release: ${release_dir}"
echo 'Local API and frontend checks passed. After DNS points to this VPS, check https://freedomsword.org/api/ready and the Telegram flow.'
