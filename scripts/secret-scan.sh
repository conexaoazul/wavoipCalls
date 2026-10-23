#!/usr/bin/env bash
set -euo pipefail

# High-confidence signatures only. Output file names, never matched secret content.
PATTERN='(ghp_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}|AKIA[0-9A-Z]{16}|sk-(proj-)?[A-Za-z0-9_-]{20,}|-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----)'

mapfile -t hits < <(
  git grep -I -l -E "$PATTERN" --     ':!package-lock.json'     ':!frontend/package-lock.json'     ':!backend/package-lock.json'     ':!docs/**'     ':!**/*.md' || true
)

if [ "${#hits[@]}" -gt 0 ]; then
  printf 'Potential high-confidence secret signatures found in tracked files:\n' >&2
  printf ' - %s\n' "${hits[@]}" >&2
  exit 1
fi

printf 'PASS: no high-confidence secret signatures found in tracked source files\n'
