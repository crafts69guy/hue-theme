# Hue Terminal Themes

Generated [Ghostty](https://ghostty.org) theme files, one per mood (Mưa, Hương,
Cung): `ghostty/hue-<mood>` — a 16-color ANSI palette plus
background/foreground/cursor/selection.

> tmux is packaged separately as a TPM plugin in
> [`packages/tmux-plugin`](../tmux-plugin) (Ghostty has no plugin/remote-theme
> mechanism, so its theme stays a plain file).

## How it is built

Everything here is **generated** by the token build — do not edit by hand. The
mapping lives in
[`packages/tokens/src/adapters/ghostty.ts`](../tokens/src/adapters/ghostty.ts);
the shared ANSI derivation lives in
[`adapters/terminal.ts`](../tokens/src/adapters/terminal.ts).

```bash
cd ../tokens && bun run build
```

## Install (Ghostty)

Copy the mood file into Ghostty's themes directory and select it:

```bash
cp ghostty/hue-mua ~/.config/ghostty/themes/hue-mua
# in ~/.config/ghostty/config:
#   theme = hue-mua
```

The theme carries colors only; your font stays in your own Ghostty config.
