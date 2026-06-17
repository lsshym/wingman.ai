#!/usr/bin/env bash
set -euo pipefail

MARKETPLACE="wingman-marketplace"
PLUGIN="wingman"
SELF_DELETE=0

info() {
  printf '%s\n' "$*"
}

fail() {
  printf 'Error: %s\n' "$*" >&2
  exit 1
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --self-delete)
      SELF_DELETE=1
      shift
      ;;
    -h|--help)
      cat <<'EOF'
Usage: bash install-codex-wingman.sh [--self-delete]

Installs Wingman for Codex from the lsshym/wingman.ai marketplace.

Options:
  --self-delete  Remove this downloaded script after a successful install.
EOF
      exit 0
      ;;
    *)
      fail "unknown option: $1"
      ;;
  esac
done

if ! command -v codex >/dev/null 2>&1; then
  fail "codex CLI was not found. Install it first: npm install -g @openai/codex"
fi

info "Adding Wingman marketplace..."
if ! codex plugin marketplace add lsshym/wingman.ai --ref main; then
  info "Marketplace add did not complete cleanly. Continuing in case it already exists..."
fi

info "Refreshing Wingman marketplace..."
if ! codex plugin marketplace upgrade "${MARKETPLACE}"; then
  info "Marketplace upgrade did not complete cleanly. Continuing with the current snapshot..."
fi

info "Installing Wingman plugin..."
if ! codex plugin add "${PLUGIN}@${MARKETPLACE}"; then
  fail "automatic plugin install failed. Run 'codex', open '/plugins', choose Wingman Marketplace, and install Wingman manually."
fi

info "Wingman installed for Codex."
info "Start a new Codex thread, then test: Use data-contracts to align this API response with the existing UI types."

if [[ "${SELF_DELETE}" -eq 1 && -f "${BASH_SOURCE[0]}" ]]; then
  rm -f -- "${BASH_SOURCE[0]}"
  info "Removed installer script: ${BASH_SOURCE[0]}"
fi
