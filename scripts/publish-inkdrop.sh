#!/usr/bin/env bash
#
# Publish generated Inkdrop themes to the Inkdrop package registry.
#
# Usage:
#   scripts/publish-inkdrop.sh [--dry-run] [--skip-build] [package-or-path...]
#
# Examples:
#   scripts/publish-inkdrop.sh --dry-run
#   scripts/publish-inkdrop.sh
#   scripts/publish-inkdrop.sh hue-mua-ui-theme
#   scripts/publish-inkdrop.sh packages/hue-mua-ui-theme

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"

DEFAULT_PACKAGES=(
  hue-cung-ui-theme
  hue-cung-syntax-theme
  hue-cung-preview-theme
  hue-huong-ui-theme
  hue-huong-syntax-theme
  hue-huong-preview-theme
  hue-mua-ui-theme
  hue-mua-syntax-theme
  hue-mua-preview-theme
)

DRY_RUN=false
SKIP_BUILD=false
REQUESTED_PACKAGES=()

usage() {
  cat <<'EOF'
Publish generated Inkdrop themes to the Inkdrop package registry.

Usage:
  scripts/publish-inkdrop.sh [--dry-run] [--skip-build] [package-or-path...]

Examples:
  scripts/publish-inkdrop.sh --dry-run
  scripts/publish-inkdrop.sh
  scripts/publish-inkdrop.sh hue-mua-ui-theme
  scripts/publish-inkdrop.sh packages/hue-mua-ui-theme
EOF
}

resolve_package_path() {
  local input="$1"

  if [[ "$input" == packages/* ]]; then
    printf '%s\n' "$ROOT/$input"
    return
  fi

  if [[ "$input" == */* ]]; then
    printf '%s\n' "$input"
    return
  fi

  printf '%s\n' "$ROOT/packages/$input"
}

while (($# > 0)); do
  case "$1" in
    -n|--dry-run)
      DRY_RUN=true
      ;;
    --skip-build)
      SKIP_BUILD=true
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    --)
      shift
      while (($# > 0)); do
        REQUESTED_PACKAGES+=("$1")
        shift
      done
      break
      ;;
    -*)
      echo "Unknown option: $1" >&2
      usage >&2
      exit 2
      ;;
    *)
      REQUESTED_PACKAGES+=("$1")
      ;;
  esac
  shift
done

if ! command -v ipm >/dev/null 2>&1; then
  echo "ipm is not available in PATH. Install it with: npm install -g @inkdropapp/ipm-cli" >&2
  exit 127
fi

if [[ "$SKIP_BUILD" == false ]]; then
  echo "== Building generated Inkdrop packages"
  bun run --cwd "$ROOT/packages/tokens" build
fi

if ((${#REQUESTED_PACKAGES[@]} == 0)); then
  REQUESTED_PACKAGES=("${DEFAULT_PACKAGES[@]}")
fi

PUBLISH_ARGS=()
if [[ "$DRY_RUN" == true ]]; then
  PUBLISH_ARGS+=(--dry-run)
fi

for package in "${REQUESTED_PACKAGES[@]}"; do
  package_path="$(resolve_package_path "$package")"

  if [[ ! -d "$package_path" ]]; then
    echo "Package directory does not exist: $package_path" >&2
    exit 1
  fi

  echo "== Publishing ${package_path#$ROOT/}"
  ipm publish "${PUBLISH_ARGS[@]}" "$package_path"
done

echo "== Inkdrop publish finished"
