#!/usr/bin/env bash
# Release packages/yaak-plugin to the standalone crafts69guy/hue-yaak repo.
# Thin wrapper over release-subtree.sh. Pass --tag vX.Y.Z [--force] as needed.
set -euo pipefail
exec "$(dirname "$0")/release-subtree.sh" \
  --prefix packages/yaak-plugin \
  --remote git@github.com:crafts69guy/hue-yaak.git \
  "$@"
