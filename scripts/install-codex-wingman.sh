#!/usr/bin/env bash
set -euo pipefail

MARKETPLACE="wingman-marketplace"
PLUGIN="wingman"
VERSION="1.0.0"
CODEX_HOME="${CODEX_HOME:-${HOME}/.codex}"
MARKETPLACE_ROOT="${CODEX_HOME}/.tmp/marketplaces/${MARKETPLACE}"
SOURCE_DIR="${MARKETPLACE_ROOT}/plugins/${PLUGIN}"
CACHE_DIR="${CODEX_HOME}/plugins/cache/${MARKETPLACE}/${PLUGIN}/${VERSION}"
CONFIG_FILE="${CODEX_HOME}/config.toml"
PLUGIN_CONFIG="[plugins.\"${PLUGIN}@${MARKETPLACE}\"]"

info() {
  printf '%s\n' "$*"
}

fail() {
  printf 'Error: %s\n' "$*" >&2
  exit 1
}

if ! command -v codex >/dev/null 2>&1; then
  fail "codex CLI was not found. Install it first: npm install -g @openai/codex"
fi

mkdir -p "${CODEX_HOME}"

info "Adding Wingman marketplace..."
if ! codex plugin marketplace add lsshym/wingman.ai; then
  info "Marketplace add did not complete cleanly. Continuing if marketplace files already exist..."
fi

if [[ ! -d "${SOURCE_DIR}" ]]; then
  fail "Wingman marketplace payload was not found at ${SOURCE_DIR}"
fi

if [[ ! -f "${SOURCE_DIR}/.codex-plugin/plugin.json" ]]; then
  fail "Wingman plugin manifest was not found at ${SOURCE_DIR}/.codex-plugin/plugin.json"
fi

if [[ ! -f "${CACHE_DIR}/.codex-plugin/plugin.json" ]]; then
  info "Codex did not create the Wingman plugin cache automatically; installing cache fallback..."
  mkdir -p "${CACHE_DIR}"
  rsync -a --delete "${SOURCE_DIR}/" "${CACHE_DIR}/"
else
  info "Wingman plugin cache already exists."
fi

touch "${CONFIG_FILE}"
if ! grep -Fq "${PLUGIN_CONFIG}" "${CONFIG_FILE}"; then
  info "Enabling Wingman in Codex config..."
  {
    printf '\n%s\n' "${PLUGIN_CONFIG}"
    printf 'enabled = true\n'
  } >> "${CONFIG_FILE}"
else
  info "Wingman is already present in Codex config."
fi

info "Wingman installed for Codex."
info "Restart Codex, then test: Use /refactor to analyze this file."
