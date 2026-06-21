#!/usr/bin/env bash
# Run every mock fixture through the full CLI pipeline (import -> map -> compliance) so the
# quality gate proves the credential-free design workflow for all components, not just Button.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if [ ! -f tools/figma-import/src/cli.ts ]; then
  echo "Design pipeline tools not present; skipped."
  exit 0
fi

tmp_dir="$(mktemp -d)"
trap 'rm -rf "$tmp_dir"' EXIT

shopt -s nullglob
fixtures=(examples/figma-input.*.json)

if [ ${#fixtures[@]} -eq 0 ]; then
  echo "No mock fixtures found in examples/." >&2
  exit 1
fi

for fixture in "${fixtures[@]}"; do
  intent_file="$tmp_dir/intent.json"
  mapping_file="$tmp_dir/mapping.json"

  tsx tools/figma-import/src/cli.ts "$fixture" >"$intent_file"
  tsx tools/component-mapper/src/cli.ts "$intent_file" >"$mapping_file"
  tsx tools/compliance-agent/src/cli.ts "$intent_file" "$mapping_file" >/dev/null

  echo "verified pipeline for $fixture"
done

echo "Design pipeline verified for ${#fixtures[@]} fixture(s)."
