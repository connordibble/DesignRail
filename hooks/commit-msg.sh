#!/usr/bin/env bash
set -euo pipefail

MESSAGE_FILE="${1:-}"

if [ -z "$MESSAGE_FILE" ] || [ ! -f "$MESSAGE_FILE" ]; then
  echo "Usage: hooks/commit-msg.sh <commit-message-file>" >&2
  exit 1
fi

subject="$(sed -n '1p' "$MESSAGE_FILE")"

if [ -z "$subject" ]; then
  echo "Commit message cannot be empty." >&2
  exit 1
fi

case "$subject" in
  Merge\ *|Revert\ *|fixup!\ *|squash!\ *)
    exit 0
    ;;
esac

allowed_types="build|chore|ci|docs|feat|fix|perf|refactor|revert|style|test"
pattern="^(${allowed_types})(\\([A-Za-z0-9._/-]+\\))?(!)?: .+"

if [[ ! "$subject" =~ $pattern ]]; then
  cat >&2 <<'EOF'
Commit message must follow Conventional Commits:

  feat(review-ui): add decision panel
  fix(api): persist edited mapping rationale
  docs: clarify mock-mode setup
  feat(schema)!: rename mapping decision states

Allowed types:
  build, chore, ci, docs, feat, fix, perf, refactor, revert, style, test
EOF
  exit 1
fi

if [ "${#subject}" -gt 100 ]; then
  echo "Commit subject should be 100 characters or fewer." >&2
  exit 1
fi

if [[ "$subject" =~ !: ]] || grep -qE '^BREAKING CHANGE:|^BREAKING-CHANGE:' "$MESSAGE_FILE"; then
  echo "Conventional Commit accepted: breaking change."
elif [[ "$subject" =~ ^feat(\(|:|!) ]]; then
  echo "Conventional Commit accepted: minor release signal."
elif [[ "$subject" =~ ^(fix|perf)(\(|:|!) ]]; then
  echo "Conventional Commit accepted: patch release signal."
else
  echo "Conventional Commit accepted: no release signal."
fi
