# Hue tmux Theme

Three Huế-inspired moods for [tmux](https://github.com/tmux/tmux), packaged as a
[TPM](https://github.com/tmux-plugins/tpm) plugin and generated from the Hue
design token system:

- **Huế Mưa** (`mua`) — a deep dark mood shaped by Huế rain and wet stone.
- **Huế Hương** (`huong`) — a softer dark mood drawn from the Perfume River and incense.
- **Huế Cung** (`cung`) — an ivory light mood informed by imperial lacquer and royal purple.

Each mood styles the status bar, window list, pane borders, messages, copy mode,
and clock. It never sets your font.

## How it is built

`hue.tmux` and `themes/hue-<mood>.conf` are **generated** by the token build — do
not edit by hand. The mapping lives in
[`packages/tokens/src/adapters/tmux.ts`](../tokens/src/adapters/tmux.ts).

```bash
cd ../tokens && bun run build
```

## Install (TPM)

```tmux
# ~/.config/tmux/tmux.conf
set -g @plugin 'crafts69guy/hue-tmux'
set -g @hue_flavour 'mua'   # or 'huong' / 'cung'
```

Then press `prefix + I` to install. TPM runs `hue.tmux`, which sources the
selected mood. Update later with `prefix + U`.

Without TPM, source a mood directly:

```tmux
run-shell "~/.config/tmux/plugins/hue-tmux/hue.tmux"
```

## Distribution note

This plugin lives inside the `hue-theme` monorepo. TPM clones a repository root,
so releases publish this directory's contents (with `hue.tmux` + `themes/` at the
root) to a standalone `hue-tmux` repository via `scripts/release-tmux.sh`.
