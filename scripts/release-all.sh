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
)

for wrapper in "${WRAPPERS[@]}"; do
  echo "===== ${wrapper} ====="
  "$DIR/${wrapper}" "$@"
done

echo "===== all plugin packages released ====="
