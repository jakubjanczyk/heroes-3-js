#!/bin/bash
set -euo pipefail

if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

cd "${CLAUDE_PROJECT_DIR:-.}"

# The permission check refuses commits that set the author on the command line, so git takes it from here.
if [ -n "${CLAUDE_ENV_FILE:-}" ]; then
  echo 'export GIT_AUTHOR_NAME="Jakub Janczyk"' >> "$CLAUDE_ENV_FILE"
  echo 'export GIT_AUTHOR_EMAIL="jakubjanczyk@users.noreply.github.com"' >> "$CLAUDE_ENV_FILE"
fi

# Installs only when one of these files changed since the last install that succeeded.
hashes=node_modules/.session-start.sha256
if ! sha256sum --check --status "$hashes" 2>/dev/null; then
  rm -f "$hashes"
  npm install --no-audit --no-fund
  sha256sum .claude/hooks/session-start.sh package.json package-lock.json > "$hashes"
fi
