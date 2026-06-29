# Hue Terminal Themes

Generated Hue theme files for terminal tooling, one per mood (Mưa, Hương, Cung):

- `ghostty/hue-<mood>` — a [Ghostty](https://ghostty.org) theme file (16-color
  ANSI palette + background/foreground/cursor/selection).
- `tmux/hue-<mood>.conf` — a sourceable [tmux](https://github.com/tmux/tmux)
  theme (status bar, window list, pane borders, messages, copy mode, clock).

## How it is built

Everything here is **generated** by the token build — do not edit by hand. The
mappings live in
[`packages/tokens/src/adapters/ghostty.ts`](../tokens/src/adapters/ghostty.ts)
and [`packages/tokens/src/adapters/tmux.ts`](../tokens/src/adapters/tmux.ts);
the shared ANSI derivation lives in
[`adapters/terminal.ts`](../tokens/src/adapters/terminal.ts).

```bash
cd ../tokens && bun run build
```

## Install

**Ghostty** — copy the mood file into Ghostty's themes directory and select it:

```bash
cp ghostty/hue-mua ~/.config/ghostty/themes/hue-mua
# in ~/.config/ghostty/config:
#   theme = hue-mua
```

**tmux** — copy the mood file next to your config and source it:

```bash
cp tmux/hue-mua.conf ~/.config/tmux/hue-mua.conf
# in ~/.config/tmux/tmux.conf:
#   source ~/.config/tmux/hue-mua.conf
```

Neither file sets a font; that stays in your own terminal/tmux config.
