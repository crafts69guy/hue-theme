#!/usr/bin/env bash
# Release packages/tmux-plugin to the standalone crafts69guy/hue-tmux repo.
# Thin wrapper over release-subtree.sh. Pass --tag vX.Y.Z [--force] as needed.
set -euo pipefail
exec "$(dirname "$0")/release-subtree.sh" \
  --prefix packages/tmux-plugin \
  --remote git@github.com:crafts69guy/hue-tmux.git \
  "$@"
