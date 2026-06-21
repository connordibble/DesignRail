#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if ! command -v pnpm >/dev/null 2>&1; then
  echo "pnpm is required to run the quality gate." >&2
  exit 1
fi

run_script() {
  echo "==> pnpm run $1"
  pnpm run "$1"
}

run_script secrets:check
run_script mock-mode:check
run_script typecheck
run_script lint
run_script format:check
run_script graphql:check
run_script db:check
run_script test
run_script compliance:review
run_script design:verify
