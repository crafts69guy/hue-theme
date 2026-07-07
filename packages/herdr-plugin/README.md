# <img src="https://raw.githubusercontent.com/crafts69guy/hue-theme/main/design/hue-mark.svg" height="28" alt="" valign="middle" /> Hue for herdr

> Huế-inspired themes for [herdr](https://herdr.dev), packaged as a herdr
> plugin — generated from the
> [Hue design token system](https://github.com/crafts69guy/hue-theme).

Three moods drawn from the atmosphere and visual culture of Huế, Việt Nam:

| Mood | State value | Appearance | Feel |
| --- | --- | --- | --- |
| **Huế Mưa** | `mua` | dark | deep dark, rain and wet stone |
| **Huế Hương** | `huong` | dark | softer dark, river green and incense |
| **Huế Cung** | `cung` | light | ivory light, lacquer and royal purple |

## Why this exists as a plugin, not a config file

herdr has no scriptable theme API: no `herdr theme` subcommand, no socket
method, and plugins cannot edit `config.toml` or register keybindings on their
own. The only way to change herdr's colors is to write
`[theme.custom]` into `config.toml` and call `herdr server reload-config`.
This plugin packages that splice-and-reload step as one `apply-mood` action so
it isn't duplicated between a keybinding, a startup hook, and any external
shell script that wants to trigger it.

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
