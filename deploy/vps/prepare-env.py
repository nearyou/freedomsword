#!/usr/bin/env python3
"""Merge a transferred local backend .env into the VPS .env without printing secrets."""

import os
import re
import shutil
import sys
from pathlib import Path


VPS_SETTINGS = {
    "NODE_ENV": '"production"',
    "APP_ENV": '"staging"',
    "HOST": '"127.0.0.1"',
    "PORT": '"3001"',
    "APP_ORIGIN": '"https://freedomsword.org"',
    "TELEGRAM_AUTH_ENABLED": '"true"',
    "TELEGRAM_AUTH_MAX_AGE_SECONDS": '"300"',
    "SESSION_MAX_AGE_SECONDS": '"21600"',
    "ELIGIBILITY_PROVIDER": '"mock"',
    "RATE_LIMIT_BACKEND": '"redis"',
    "REDIS_URL": '"redis://127.0.0.1:6379"',
    "OUTBOX_PROCESSING": '"worker"',
    "BLOCKCHAIN_ADAPTER": '"mock"',
    "ALLOW_DEMO_AUTH": '"false"',
}
REQUIRED_SECRETS = (
    "DATABASE_URL",
    "TELEGRAM_BOT_TOKEN",
    "SESSION_SECRET",
    "BALLOT_SECRET",
    "ELIGIBILITY_COMMITMENT_SECRET",
)


def parse_env(path):
    values = {}
    if not path.exists():
        return values
    for number, line in enumerate(path.read_text(encoding="utf-8").splitlines(), 1):
        stripped = line.strip()
        if not stripped or stripped.startswith("#"):
            continue
        match = re.fullmatch(r"(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)", stripped)
        if not match:
            raise ValueError(f"Invalid .env assignment in {path.name} at line {number}")
        values[match.group(1)] = match.group(2)
    return values


def plain(value):
    value = value.strip()
    if len(value) >= 2 and value[0] == value[-1] and value[0] in "\"'":
        return value[1:-1]
    return value


def prepare_env(import_path, target_path):
    if not import_path.is_file() or import_path.resolve() == target_path.resolve():
        raise ValueError("Provide a transferred .env file separate from backend/.env")
    imported = parse_env(import_path)
    existing = parse_env(target_path)
    merged = imported.copy()
    merged.update({key: value for key, value in existing.items() if plain(value)})
    merged.update(VPS_SETTINGS)
    if "NEXT_PUBLIC_APP_URL" in merged:
        merged["NEXT_PUBLIC_APP_URL"] = VPS_SETTINGS["APP_ORIGIN"]
    missing = [key for key in REQUIRED_SECRETS if not plain(merged.get(key, "")) or
               plain(merged.get(key, "")).startswith(("YOUR_", "GENERATE_", "REPLACE_"))]
    if missing:
        raise ValueError("Missing real values for: " + ", ".join(missing))

    temporary = target_path.with_name(f".env.tmp.{os.getpid()}")
    try:
        descriptor = os.open(temporary, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
        with os.fdopen(descriptor, "w", encoding="utf-8", newline="\n") as output:
            output.writelines(f"{key}={value}\n" for key, value in merged.items())
        if target_path.exists():
            backup = target_path.with_name(f".env.backup.{os.getpid()}")
            shutil.copyfile(target_path, backup)
            backup.chmod(0o600)
        os.replace(temporary, target_path)
        target_path.chmod(0o600)
        import_path.unlink()
    finally:
        temporary.unlink(missing_ok=True)


if __name__ == "__main__":
    if len(sys.argv) != 3:
        raise SystemExit("Usage: python3 deploy/vps/prepare-env.py backend/.env.import backend/.env")
    try:
        prepare_env(Path(sys.argv[1]), Path(sys.argv[2]))
    except (OSError, ValueError) as error:
        raise SystemExit(str(error)) from None
    print("VPS backend/.env prepared; existing VPS secrets kept and import file removed.")
