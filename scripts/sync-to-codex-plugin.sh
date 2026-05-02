#!/usr/bin/env bash
set -euo pipefail

FORK="${WINGMAN_CODEX_PLUGINS_FORK:-}"
REMOTE_URL="${WINGMAN_CODEX_PLUGINS_REMOTE:-}"
WORKTREE_DIR="${WINGMAN_CODEX_PLUGINS_DIR:-../openai-codex-plugins}"
DEST_REL="plugins/wingman"
BOOTSTRAP=0
DRY_RUN=0

usage() {
  cat <<'EOF'
Usage: scripts/sync-to-codex-plugin.sh [--bootstrap] [--dry-run] [--dest PATH] [--fork OWNER/REPO]

Sync Wingman's Codex plugin payload into an openai-codex-plugins checkout at plugins/wingman.

Options:
  --bootstrap       Clone the Codex plugins repository if --dest does not exist.
  --dry-run         Show the rsync plan without changing the destination.
  --dest PATH       Path to a Codex marketplace checkout. Defaults to ../openai-codex-plugins.
  --fork OWNER/REPO GitHub fork used for bootstrap, such as your-org/wingman-codex-plugins.

Environment:
  WINGMAN_CODEX_PLUGINS_DIR      Destination checkout path.
  WINGMAN_CODEX_PLUGINS_FORK     GitHub fork for bootstrap.
  WINGMAN_CODEX_PLUGINS_REMOTE   Full git remote URL for bootstrap.
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --bootstrap)
      BOOTSTRAP=1
      shift
      ;;
    --dry-run)
      DRY_RUN=1
      shift
      ;;
    --dest)
      WORKTREE_DIR="${2:?--dest requires a path}"
      shift 2
      ;;
    --fork)
      FORK="${2:?--fork requires OWNER/REPO}"
      REMOTE_URL="git@github.com:${FORK}.git"
      shift 2
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown option: $1" >&2
      usage >&2
      exit 2
      ;;
  esac
done

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SOURCE_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
WORKTREE_DIR="$(cd "$(dirname "${WORKTREE_DIR}")" && pwd)/$(basename "${WORKTREE_DIR}")"
DEST_DIR="${WORKTREE_DIR}/${DEST_REL}"

if [[ ! -f "${SOURCE_ROOT}/.codex-plugin/plugin.json" ]]; then
  echo "Missing ${SOURCE_ROOT}/.codex-plugin/plugin.json; run from the Wingman repository." >&2
  exit 1
fi

if [[ ! -d "${WORKTREE_DIR}" ]]; then
  if [[ "${BOOTSTRAP}" -ne 1 ]]; then
    echo "Destination checkout does not exist: ${WORKTREE_DIR}" >&2
    echo "Create it or rerun with --bootstrap." >&2
    exit 1
  fi
  if [[ -z "${REMOTE_URL}" ]]; then
    if [[ -n "${FORK}" ]]; then
      REMOTE_URL="git@github.com:${FORK}.git"
    else
      echo "Bootstrap requires --fork OWNER/REPO or WINGMAN_CODEX_PLUGINS_REMOTE." >&2
      exit 1
    fi
  fi
  git clone "${REMOTE_URL}" "${WORKTREE_DIR}"
fi

if [[ ! -d "${WORKTREE_DIR}/.git" ]]; then
  echo "Destination is not a git checkout: ${WORKTREE_DIR}" >&2
  exit 1
fi

mkdir -p "${DEST_DIR}"

RSYNC_ARGS=(
  -a
  --delete
  --exclude ".DS_Store"
  --exclude ".git/"
  --exclude ".gitignore"
  --exclude ".agents/"
  --exclude ".claude-plugin/"
  --exclude ".cursor-plugin/"
  --exclude "docs/"
  --exclude "hooks/"
  --exclude "node_modules/"
  --exclude "package.json"
  --exclude "package-lock.json"
  --exclude "plugins/"
  --exclude "scripts/"
  --exclude "tests/"
)

if [[ "${DRY_RUN}" -eq 1 ]]; then
  RSYNC_ARGS+=(--dry-run --itemize-changes)
fi

rsync "${RSYNC_ARGS[@]}" "${SOURCE_ROOT}/" "${DEST_DIR}/"

if [[ "${DRY_RUN}" -eq 0 ]]; then
  echo "Synced Wingman Codex plugin to ${DEST_DIR}"
  echo "Next: cd ${WORKTREE_DIR} && git diff -- ${DEST_REL}"
fi
