# Hue Terminal Themes

Generated theme files for terminal tools, one per mood (Mưa, Hương, Cung):

- [Ghostty](https://ghostty.org): `ghostty/hue-<mood>` — a 16-color ANSI
  palette plus background/foreground/cursor/selection.
- [bat](https://github.com/sharkdp/bat): `bat/hue-<mood>.tmTheme` — a
  Sublime/syntect theme mapping Hue's syntax and status roles.
- [lazygit](https://github.com/jesseduffield/lazygit): `lazygit/hue-<mood>.yml`
  — a gui.theme fragment merged in via `LG_CONFIG_FILE`.
- [delta](https://github.com/dandavison/delta):
  `delta/hue-<mood>.gitconfig` — a `[delta "hue"]` feature included from your
  gitconfig. It colors every diff, including the one lazygit shows.

> tmux is packaged separately as a TPM plugin in
> [`packages/tmux-plugin`](../tmux-plugin) (Ghostty has no plugin/remote-theme
> mechanism, so its theme stays a plain file).

## How it is built

Everything here is **generated** by the token build — do not edit by hand. The
mapping lives in
[`packages/tokens/src/adapters/ghostty.ts`](../tokens/src/adapters/ghostty.ts);
the bat mapping in
[`packages/tokens/src/adapters/bat.ts`](../tokens/src/adapters/bat.ts); the
lazygit mapping in
[`packages/tokens/src/adapters/lazygit.ts`](../tokens/src/adapters/lazygit.ts);
the delta mapping in
[`packages/tokens/src/adapters/delta.ts`](../tokens/src/adapters/delta.ts); the
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

## Install (lazygit)

lazygit has no config include, but `LG_CONFIG_FILE` merges a comma-separated
list left to right:

```bash
mkdir -p ~/.config/lazygit/themes
cp lazygit/hue-*.yml ~/.config/lazygit/themes/
ln -sf hue-mua.yml ~/.config/lazygit/themes/hue-current.yml
export LG_CONFIG_FILE="$HOME/.config/lazygit/config.yml,$HOME/.config/lazygit/themes/hue-current.yml"
```

Switch moods by re-pointing the `hue-current.yml` symlink. This theme colors
lazygit's panels only — the diff body is drawn by your pager, so install the
delta theme below as well.

## Install (delta)

delta reads its options from git config, so the fragment is included rather than
copied over anything. Point the include at a symlink and the mood switch stays a
one-line change:

```bash
mkdir -p ~/.config/git/hue-themes
cp delta/hue-*.gitconfig ~/.config/git/hue-themes/
ln -sf hue-mua.gitconfig ~/.config/git/hue-themes/hue-current.gitconfig
```

```ini
# in ~/.gitconfig — written once, never touched again when switching moods:
[include]
    path = ~/.config/git/hue-themes/hue-current.gitconfig

[delta]
    features = hue
    line-numbers = true
    navigate = true
```

Keep behavior options (`line-numbers`, `navigate`, `hyperlinks`, `tabs`) in your
own `[delta]` section — the fragment carries colors only. Do not set
`syntax-theme` or `dark`/`light` there: each mood declares its own, which is how
Cung comes up light instead of being forced dark.

The fragment names the bat theme of the same mood for syntax highlighting, so
install the bat themes above and run `bat cache --build` first — delta falls
back to its default theme silently when the name is missing. Verify with
`delta --show-config | grep plus-style`, which is also how you catch a fragment
delta refused to parse.
