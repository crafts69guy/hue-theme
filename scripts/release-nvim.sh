#!/usr/bin/env bash
#
# Release the generated Neovim colorscheme to a standalone repository.
#
# lazy.nvim (and most plugin managers) only add a repository ROOT to the
# runtimepath, not a subdirectory. The colorscheme lives in
# packages/nvim-plugin/, so this script:
#   1. regenerates the Lua tree from the source tokens,
#   2. fails fast if that leaves uncommitted changes (the split needs commits),
#   3. uses `git subtree split` to produce a branch whose root IS the package,
#   4. pushes that branch to the standalone repo's main branch,
#   5. optionally creates and pushes a semver tag.
#
# Usage:
#   scripts/release-nvim.sh [--remote <git-url>] [--tag vX.Y.Z] [--force]
#
# Examples:
#   scripts/release-nvim.sh
#   scripts/release-nvim.sh --tag v0.1.0
#   scripts/release-nvim.sh --remote git@github.com:crafts69guy/hue-nvim.git --tag v0.2.0 --force

set -euo pipefail

PREFIX="packages/nvim-plugin"
REMOTE="git@github.com:crafts69guy/hue-nvim.git"
TARGET_BRANCH="main"
SPLIT_BRANCH="nvim-dist"
TAG=""
FORCE=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --remote) REMOTE="$2"; shift 2 ;;
    --tag)    TAG="$2"; shift 2 ;;
    --force)  FORCE="--force"; shift ;;
    -h|--help)
      sed -n '2,21p' "$0"; exit 0 ;;
    *) echo "Unknown argument: $1" >&2; exit 2 ;;
  esac
done

# Always operate from the repository root.
ROOT="$(git rev-parse --show-toplevel)"
cd "$ROOT"

echo "==> Regenerating tokens + Neovim Lua tree"
bun run --cwd packages/tokens build

# Ensure the package ships a license even on a fresh checkout.
if [[ ! -f "$PREFIX/LICENSE" ]]; then
  echo "==> Copying LICENSE into $PREFIX"
  cp LICENSE "$PREFIX/LICENSE"
fi

# subtree split operates on committed history, so the tree must be clean.
if ! git diff --quiet || ! git diff --cached --quiet; then
  echo "ERROR: working tree has uncommitted changes after build." >&2
  echo "       Commit the regenerated $PREFIX (and LICENSE) first, then re-run." >&2
  git status --short
  exit 1
fi

echo "==> Splitting $PREFIX into '$SPLIT_BRANCH'"
git branch -D "$SPLIT_BRANCH" >/dev/null 2>&1 || true
git subtree split --prefix="$PREFIX" -b "$SPLIT_BRANCH"

echo "==> Pushing '$SPLIT_BRANCH' -> $REMOTE ($TARGET_BRANCH)"
git push $FORCE "$REMOTE" "$SPLIT_BRANCH:$TARGET_BRANCH"

if [[ -n "$TAG" ]]; then
  echo "==> Tagging $TAG on the split and pushing it"
  git tag -f "$TAG" "$SPLIT_BRANCH"
  git push $FORCE "$REMOTE" "$TAG"
fi

# Tidy up the temporary split branch.
git branch -D "$SPLIT_BRANCH" >/dev/null 2>&1 || true

echo "==> Done. Install with: { \"crafts69guy/hue-nvim\", priority = 1000, lazy = false }"
