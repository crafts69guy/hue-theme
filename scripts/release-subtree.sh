#!/usr/bin/env bash
#
# Release a generated subdirectory package to a standalone repository.
#
# Most plugin managers (lazy.nvim, TPM, ...) add a repository ROOT to their
# load path, not a subdirectory. Generated packages live under packages/<name>/,
# so this script:
#   1. regenerates the package from the source tokens,
#   2. fails fast if that leaves uncommitted changes (the split needs commits),
#   3. uses `git subtree split` to produce a branch whose root IS the package,
#   4. pushes that branch to the standalone repo's main branch,
#   5. optionally creates and pushes a semver tag.
#
# Usage:
#   scripts/release-subtree.sh --prefix <dir> --remote <git-url> [--tag vX.Y.Z] [--force]

set -euo pipefail

PREFIX=""
REMOTE=""
TARGET_BRANCH="main"
TAG=""
FORCE=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --prefix) PREFIX="$2"; shift 2 ;;
    --remote) REMOTE="$2"; shift 2 ;;
    --tag)    TAG="$2"; shift 2 ;;
    --force)  FORCE="--force"; shift ;;
    -h|--help) sed -n '2,18p' "$0"; exit 0 ;;
    *) echo "Unknown argument: $1" >&2; exit 2 ;;
  esac
done

if [[ -z "$PREFIX" || -z "$REMOTE" ]]; then
  echo "ERROR: --prefix and --remote are required." >&2
  exit 2
fi

ROOT="$(git rev-parse --show-toplevel)"
cd "$ROOT"

SPLIT_BRANCH="release-split-$(basename "$PREFIX")"

echo "==> Regenerating tokens"
bun run --cwd packages/tokens build

# Ensure the package ships a license even on a fresh checkout.
if [[ -f LICENSE && ! -f "$PREFIX/LICENSE" ]]; then
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

git branch -D "$SPLIT_BRANCH" >/dev/null 2>&1 || true
echo "==> Done releasing $PREFIX -> $REMOTE"
