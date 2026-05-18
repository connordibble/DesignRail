#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "Not inside a Git repository." >&2
  exit 1
fi

current_version="$(node -e "console.log(require('./package.json').version)")"
last_tag="$(git describe --tags --abbrev=0 2>/dev/null || true)"

if [ -n "$last_tag" ]; then
  range="$last_tag..HEAD"
else
  range="HEAD"
fi

if ! git rev-parse --verify HEAD >/dev/null 2>&1; then
  echo "No commits yet. Current version: $current_version"
  echo "Next version: $current_version"
  echo "Bump: none"
  exit 0
fi

commits="$(git log --format='%s%n%b%n---END-COMMIT---' "$range" 2>/dev/null || true)"

if [ -z "$commits" ]; then
  echo "No commits to evaluate. Current version: $current_version"
  echo "Next version: $current_version"
  echo "Bump: none"
  exit 0
fi

bump="none"

if printf '%s\n' "$commits" | grep -qE '^[a-z]+(\([^)]+\))?!: |^BREAKING CHANGE:|^BREAKING-CHANGE:'; then
  bump="major"
elif printf '%s\n' "$commits" | grep -qE '^feat(\([^)]+\))?: '; then
  bump="minor"
elif printf '%s\n' "$commits" | grep -qE '^(fix|perf)(\([^)]+\))?: '; then
  bump="patch"
fi

next_version="$current_version"

if [ "$bump" != "none" ]; then
  IFS='.' read -r major minor patch <<EOF
$current_version
EOF

  case "$bump" in
    major)
      major=$((major + 1))
      minor=0
      patch=0
      ;;
    minor)
      minor=$((minor + 1))
      patch=0
      ;;
    patch)
      patch=$((patch + 1))
      ;;
  esac

  next_version="${major}.${minor}.${patch}"
fi

echo "Current version: $current_version"
if [ -n "$last_tag" ]; then
  echo "Last tag: $last_tag"
else
  echo "Last tag: none"
fi
echo "Bump: $bump"
echo "Next version: $next_version"
echo
echo "Release-signaling commits:"
printf '%s\n' "$commits" | grep -E '^[a-z]+(\([^)]+\))?!?: ' || true
