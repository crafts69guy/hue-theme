# <img src="https://raw.githubusercontent.com/crafts69guy/hue-theme/main/design/hue-mark.svg" height="28" alt="" valign="middle" /> Hue for herdr

> Huế-inspired themes for [herdr](https://herdr.dev), packaged as a herdr
> plugin — generated from the
> [Hue design token system](https://github.com/crafts69guy/hue-theme).

Three moods drawn from the atmosphere and visual culture of Huế, Việt Nam:

| Mood | State value | Appearance | Feel |
| --- | --- | --- | --- |
| **Huế Mưa** | `mua` | dark | midnight navy, rain-blue chrome, vivid signals |
| **Huế Hương** | `huong` | dark | softer dark, river green and incense |
| **Huế Cung** | `cung` | light | pale blue wash, white panels, deep blue accents |

## Why this exists as a plugin, not a config file

herdr has no scriptable theme API: no `herdr theme` subcommand, no socket
method, and plugins cannot edit `config.toml` or register keybindings on their
own. The only way to change herdr's colors is to write
`[theme.custom]` into `config.toml` and call `herdr server reload-config`.
This plugin packages that splice-and-reload step as one `apply-mood` action so
it isn't duplicated between a keybinding, a startup hook, and any external
shell script that wants to trigger it.

Since 0.2.0 the fragments cover herdr's full `CustomThemeColors` slot set
(`panel_bg`, `surface0/1`, `surface_dim`, `overlay0/1`, `text`, `subtext0`,
`accent`, and the status colors), so the sidebar, tab bar, dividers, and
agent-state indicators are all Hue-colored — not just the handful of tokens
herdr's docs mention. herdr silently ignores unknown `[theme.custom]` keys;
the slot roles were verified empirically against herdr 0.7.3.

`apply-mood` also themes **[`tuicr`](https://github.com/agavra/tuicr)**, the review
TUI the [`herdr-ghq`](https://github.com/crafts69guy/herdr-ghq) plugin opens for git
reviews. (It replaces the `hunk` theming that shipped in 0.3.0–0.4.x; herdr-ghq moved
to tuicr, and nothing here writes a hunk config any more.)

tuicr takes named local themes, so — unlike hunk — **your `~/.config/tuicr/config.toml`
is never overwritten**. `apply-mood` copies two files of its own into
`~/.config/tuicr/themes/`:

- `hue-<mood>.toml` — the theme. All 41 of tuicr's required colour keys, from the Hue
  tokens: chrome, the diff area (add/remove rows tinted onto the Hue canvas), file and
  review status, comment badges, and messages.
- `hue-<mood>.tmTheme` — the same bat theme this repo generates, which the theme's
  `syntax_theme` points at. tuicr resolves that path relative to the theme file, which
  is why the pair installs together.

It then splices one line, `theme = "hue-<mood>"`, into tuicr's config, rewriting an
existing `theme =` in place and leaving every other setting alone.

Both bundled `tuicr/hue-<mood>.*` files are build output, like `themes/`.

## Installation

```sh
herdr plugin install crafts69guy/hue-theme/packages/herdr-plugin
```

For local development, symlink your working checkout instead:

```sh
herdr plugin link /path/to/hue-theme/packages/herdr-plugin
```

## Usage

The `apply-mood` action reads the current mood from
`${XDG_STATE_HOME:-$HOME/.local/state}/hue-theme/current` — the same state
file the [`hue-theme` fish function](../fish-themes) writes when switching
tmux/Ghostty/Neovim, so herdr always follows whatever mood you last selected.

- **On herdr startup**: the `workspace.created` event hook re-applies the
  current mood automatically.
- **On demand**: bind it in `config.toml`, e.g.
  ```toml
  [[keys.command]]
  key = "prefix+alt+t"
  type = "plugin_action"
  command = "hue-theme:apply-mood"
  ```
- **From a shell/fish function**:
  ```sh
  herdr plugin action invoke apply-mood --plugin hue-theme
  ```

## Configuration

Nothing to configure directly — this plugin has no options of its own. Change
mood with the `hue-theme` fish function; this plugin only reflects it into
herdr.

## Credits

Generated from the
[Hue design token system](https://github.com/crafts69guy/hue-theme) — `themes/`
is build output, not hand-edited. Rooted in the visual culture of Huế, Việt Nam.

## License

[MIT](./LICENSE)
