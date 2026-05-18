#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if ! command -v rg >/dev/null 2>&1; then
  echo "ripgrep is required for mock-mode checks." >&2
  exit 1
fi

if ! rg --quiet "Mock-mode-first rules" AGENTS.md; then
  echo "AGENTS.md must define mock-mode-first rules." >&2
  exit 1
fi

if ! rg --quiet --ignore-case "mock" README.md; then
  echo "README.md must document the mock-mode path." >&2
  exit 1
fi

prohibited_patterns=(
  'must set[^\n]*(FIGMA|Figma)'
  'cannot run[^\n]*without[^\n]*(FIGMA|Figma)'
  'default path requires[^\n]*(FIGMA|Figma)'
  'real Figma credentials are required'
)

common_args=(
  --hidden
  --line-number
  --glob '!.git/**'
  --glob '!node_modules/**'
  --glob '!dist/**'
  --glob '!build/**'
  --glob '!coverage/**'
  --glob '!hooks/mock-mode-check.sh'
)

failed=0
for pattern in "${prohibited_patterns[@]}"; do
  if rg "${common_args[@]}" --regexp "$pattern" .; then
    failed=1
  fi
done

if [ "$failed" -ne 0 ]; then
  echo "Mock mode must remain the default path without required Figma credentials." >&2
  exit 1
fi

echo "Mock-mode default path looks intact."
