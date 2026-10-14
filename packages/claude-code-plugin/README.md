# Hue Claude Code themes

The `claude-code` adapter generates Mưa, Hương and Cung themes plus matching
semantic palettes for the existing
[claude-statusline.nvim](https://github.com/crafts69guy/claude-statusline.nvim)
renderer. Load this local plugin in one session:

```fish
claude --plugin-dir /path/to/hue-theme/packages/claude-code-plugin
```

Select Huế Mưa, Huế Hương or Huế Cung in `/theme`. Plugin theme identifiers are
`custom:hue-theme:hue-mua`, `custom:hue-theme:hue-huong` and
`custom:hue-theme:hue-cung`. The plugin does not install a statusline command or
write persistent settings. For coordinated startup use the renderer's Fish
launcher with `HUE_THEME_ROOT` pointing to this checkout:

```fish
set -gx HUE_THEME_ROOT /path/to/hue-theme
claude-statusline --mood huong --
```

That launcher passes the plugin and session settings to Claude and renders the
model, directory basename, branch and compact context percentage using
`statusline/hue-<mood>.json`. Choosing another `/theme` during a session does not
synchronize the statusline. Choose the terminal's Hue mood separately.

Theme format and color semantics follow the
[official custom-theme reference](https://code.claude.com/docs/en/terminal-config#create-a-custom-theme).
Themes start from `dark-ansi` or `light-ansi`, then override every known color
key verified in Claude Code 2.1.299. UI surfaces, text, borders, accents, status,
diff line/word backgrounds, message and composer backgrounds, modes, usage
meter, labels, subagent colors and rainbow/shimmer variants use Hue semantics
or shared contrast-gated derivations. Named subagent and rainbow hues share
nearby Hue roles where the palette has no separate cyan/orange color. Syntax scope colors are controlled by
Claude; this plugin has no syntax-theme contract.

Ten keys supplement the documented token reference: `skill`,
`autoAcceptShimmer`, `claudeBlue_FOR_SYSTEM_SPINNER`,
`claudeBlueShimmer_FOR_SYSTEM_SPINNER`, `background`,
`composerSidebarBackground`, `professionalBlue`, `chromeYellow`, `clawd_body`
and `clawd_background`. These ship in 2.1.299 but remain version-sensitive;
unknown keys are ignored by Claude. Plugin theme discovery is an experimental
manifest field. No marketplace publication is performed.

Generated JSON must not be edited: update `packages/tokens/src/adapters/claude-code.ts`
and run `bun run build`. The statusline JSON carries exactly `segments` and the
complete resolved Hue `palette`; it introduces no separate color contract.
