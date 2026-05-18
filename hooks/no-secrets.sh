#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if ! command -v rg >/dev/null 2>&1; then
  echo "ripgrep is required for secrets scanning." >&2
  exit 1
fi

common_args=(
  --hidden
  --line-number
  --glob '!.git/**'
  --glob '!node_modules/**'
  --glob '!dist/**'
  --glob '!build/**'
  --glob '!coverage/**'
  --glob '!pnpm-lock.yaml'
  --glob '!hooks/no-secrets.sh'
)

patterns=(
  'AKIA[0-9A-Z]{16}'
  '-----BEGIN (RSA |DSA |EC |OPENSSH |PGP )?PRIVATE KEY-----'
  'gh[pousr]_[A-Za-z0-9_]{36,255}'
  'xox[baprs]-[0-9A-Za-z-]+'
  'sk-[A-Za-z0-9]{20,}'
  'FIGMA_(ACCESS_)?TOKEN[[:space:]]*='
  'SUPABASE_SERVICE_ROLE_KEY[[:space:]]*='
  'DATABASE_URL[[:space:]]*=[^[:space:]]+'
)

failed=0
for pattern in "${patterns[@]}"; do
  if rg "${common_args[@]}" --regexp "$pattern" .; then
    failed=1
  fi
done

if [ "$failed" -ne 0 ]; then
  echo "Potential secret detected. Remove it or replace it with a public-safe mock value." >&2
  exit 1
fi

echo "No obvious secrets detected."
