# Hue Terminal Themes

Generated theme files for terminal tools, one per mood (Mưa, Hương, Cung):

- [Ghostty](https://ghostty.org): `ghostty/hue-<mood>` — a 16-color ANSI
  palette plus background/foreground/cursor/selection.
- [bat](https://github.com/sharkdp/bat): `bat/hue-<mood>.tmTheme` — a
  Sublime/syntect theme mapping Hue's syntax and status roles.

> tmux is packaged separately as a TPM plugin in
> [`packages/tmux-plugin`](../tmux-plugin) (Ghostty has no plugin/remote-theme
> mechanism, so its theme stays a plain file).

## How it is built

Everything here is **generated** by the token build — do not edit by hand. The
mapping lives in
[`packages/tokens/src/adapters/ghostty.ts`](../tokens/src/adapters/ghostty.ts);
the bat mapping in
[`packages/tokens/src/adapters/bat.ts`](../tokens/src/adapters/bat.ts); the
shared ANSI derivation lives in
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

## Install (bat)

Copy the `.tmTheme` files into bat's themes directory, rebuild the cache, and
select a mood:

```bash
mkdir -p "$(bat --config-dir)/themes"
cp bat/hue-*.tmTheme "$(bat --config-dir)/themes/"
bat cache --build
# select per invocation, via config, or via the environment:
bat --theme hue-mua src/main.rs
export BAT_THEME=hue-mua   # fish: set -Ux BAT_THEME hue-mua
```

bat names themes by the `name` key inside the file, which is set to
`hue-<mood>` (matching the Ghostty/Neovim theme names), not by the filename.
