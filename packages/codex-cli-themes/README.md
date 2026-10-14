# Hue Codex CLI themes

The `codex-cli` adapter generates Mưa, Hương and Cung `.tmTheme` files for the
native Codex terminal UI. These are separate from desktop Appearance import
strings in `packages/codex-themes`.

Copy `themes/hue-<mood>.tmTheme` to `$CODEX_HOME/themes/` (default
`~/.codex/themes/`) and select `hue-<mood>` in `/theme`, or set the native
`[tui] theme` preference. The existing
[codex-statusline.nvim](https://github.com/crafts69guy/codex-statusline.nvim)
Fish launcher bundles all three files and offers `codex-statusline --mood huong`;
installation remains explicit and honors `CODEX_HOME`.

The themes reuse bat's syntax scope rules and add `codex.accent`,
`markup.inserted` and `markup.deleted`. Diff backgrounds reuse Hue's `diffRow`
derivation. Verified against Codex CLI 0.162.1: syntax rendering consumes
foreground and bold style, so italic/underline rules remain in the portable
tmTheme but are not rendered by Codex. Accent and diff colors are dedicated
native scopes; tmTheme globals do not recolor the whole TUI, terminal canvas,
footer background or borders. Selected footer fields consume semantic scopes
when `status_line_use_colors = true`; the host adjusts saturation and contrast.
The terminal palette remains a separate choice.

Upstream references: [theme loading and syntax/diff conversion](https://github.com/openai/codex/blob/rust-v0.162.1/codex-rs/tui/src/render/highlight.rs)
and [footer semantic styling](https://github.com/openai/codex/blob/rust-v0.162.1/codex-rs/tui/src/bottom_pane/status_line_style.rs).
Generated files must not be edited: update `packages/tokens/src/adapters/codex-cli.ts`
and run `bun run build`. The default bat and tuicr syntax artifacts remain unchanged.
