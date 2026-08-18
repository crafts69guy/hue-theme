#!/usr/bin/env bash
#
# Release every subtree-packaged plugin to its standalone repo in one pass by
# running each per-plugin wrapper. Flags (e.g. --force, --tag) are forwarded to
# every wrapper.
#
# Usage:
#   scripts/release-all.sh [--force] [--tag vX.Y.Z]
#
# Note: a single --tag is applied to EVERY repo, so only pass it when the plugins
# are versioned in lockstep. For an independent version bump, run the per-plugin
# wrapper directly. With no --tag, each repo's main is updated without tagging —
# ideal for shared content changes (READMEs, logo, …).

set -euo pipefail
DIR="$(cd "$(dirname "$0")" && pwd)"

# Each per-plugin wrapper owns its own prefix + standalone remote.
WRAPPERS=(
  release-nvim.sh
  release-tmux.sh
  release-yaak.sh
)

# Parse only what this script itself needs; everything is still forwarded on.
TAG=""
for ((i = 1; i <= $#; i++)); do
  if [[ "${!i}" == "--tag" ]]; then
    j=$((i + 1))
    TAG="${!j:-}"
  fi
done

# Fail before anything is pushed rather than after three repositories already
# took the release and only the monorepo tag was left to write.
if [[ -n "$TAG" ]] && git rev-parse -q --verify "refs/tags/$TAG" >/dev/null; then
  echo "ERROR: tag $TAG already exists in this repository." >&2
  echo "       Pick the next version, or delete the tag if it was a mistake." >&2
  exit 1
fi

for wrapper in "${WRAPPERS[@]}"; do
  echo "===== ${wrapper} ====="
  "$DIR/${wrapper}" "$@"
done

# Each standalone repo now carries the tag on its own split. Mark the commit in
# this repository too, otherwise a released version cannot be traced back to the
# source it was built from.
if [[ -n "$TAG" ]]; then
  echo "===== tagging the monorepo ====="
  git tag -a "$TAG" -m "$TAG — $(git log -1 --format=%s)" HEAD
  git push origin "$TAG"
fi

echo "===== all plugin packages released ====="
