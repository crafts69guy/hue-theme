#!/usr/bin/env bash
#
# Publish the Yaak theme plugin to Yaak's plugin registry.
#
# Yaak installs this plugin from its registry, not from the standalone GitHub
# repo — an installed plugin records `source = registry` and a pinned version,
# and re-syncs from there on its own schedule. That makes the registry the only
# channel that reaches users, and a version bump the only signal that anything
# changed. Editing files in the installed plugin directory is overwritten on the
# next check.
#
# The bundle in build/ is produced by yaakcli, not by the token build, so
# `bun run build` alone never refreshes what ships.
#
# Usage:
#   scripts/publish-yaak.sh [--dry-run]

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PKG="$ROOT/packages/yaak-plugin"
CLI="$PKG/node_modules/.bin/yaakcli"
DRY_RUN=false

while (($# > 0)); do
  case "$1" in
    -n|--dry-run) DRY_RUN=true ;;
    -h|--help) sed -n '2,18p' "$0"; exit 0 ;;
    *) echo "Unknown option: $1" >&2; exit 2 ;;
  esac
  shift
done

[[ -x "$CLI" ]] || { echo "yaakcli not found — run 'bun install' first." >&2; exit 127; }

VERSION="$(node -p "require('$PKG/package.json').version")"

echo "== Regenerating theme source from tokens"
bun run --cwd "$ROOT/packages/tokens" build

echo "== Building the plugin bundle"
(cd "$PKG" && "$CLI" plugin build)

# The bundle is what ships; if the tokens moved and this was not rebuilt, the
# published version would carry stale colours under a fresh version number.
if ! grep -q "$(node -p "
  const t = require('$ROOT/packages/tokens/generated/themes.json');
  t.themes.find((m) => m.id === 'mua').semantic['surface.canvas'];
")" "$PKG/build/index.js"; then
  echo "ERROR: build/index.js does not contain the current Mưa canvas colour." >&2
  echo "       The bundle is stale; check that 'yaakcli plugin build' succeeded." >&2
  exit 1
fi

if [[ "$DRY_RUN" == true ]]; then
  echo "== Dry run: would publish @crafts69guy/hue-theme@$VERSION"
  exit 0
fi

echo "== Publishing @crafts69guy/hue-theme@$VERSION"
(cd "$PKG" && "$CLI" plugin publish)
echo "== Done. Yaak clients pick it up on their next registry check."
