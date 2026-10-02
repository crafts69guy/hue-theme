# How themes reach users

Twelve hosts, four channels — plus the token package itself on npm. The channel is not obvious from the package layout, and
guessing it wrong is how the Yaak theme sat three months stale — a script named
`release-yaak.sh` pushes source to GitHub, but Yaak installs from its own
registry, so "releasing" it reached nobody.

| Host | Channel | Publish with | Confirm it landed |
| --- | --- | --- | --- |
| Neovim | git subtree → `crafts69guy/hue-nvim` | `scripts/release-nvim.sh --tag vX.Y.Z` | `git ls-remote --tags` on that repo |
| tmux | git subtree → `crafts69guy/hue-tmux` | `scripts/release-tmux.sh --tag vX.Y.Z` | same |
| Yaak | **Yaak plugin registry** | `bun run publish:yaak` | the `plugins` row in Yaak's `db.sqlite` |
| Inkdrop | **ipm registry** | `bun run publish:inkdrop` | `ipm search hue` |
| Ghostty, bat, lazygit, delta | local files fetched over HTTPS | `~/.scripts/sync-hue-*.sh --ref <SHA>` | grep a changed hex out of the written file |
| herdr, tuicr | local plugin path | `herdr plugin action invoke apply-mood --plugin hue-theme` | `~/.config/herdr/config.toml`; `~/.config/tuicr/themes/hue-<mood>.toml` matches the repo |
| Fish / Tide | sourced from a working copy | nothing to publish | `hue-theme <mood>` |
| ChatGPT/Codex | local share string | nothing to publish | import `hue-<mood>.txt` in Appearance |
| Token package (`@crafts69guy/hue-theme-tokens`) | **npm** | `npm publish packages/tokens --provenance=false`, run by the owner | `curl` the registry, below |

`scripts/release-all.sh` covers only the first two rows plus the Yaak *source*
mirror. It does not publish to either registry. A full release is:

```fish
bun run --cwd packages/tokens build
bun run ci
scripts/release-all.sh --tag vX.Y.Z   # subtrees + tags this repo
bun run publish:inkdrop               # bump adapters/inkdrop.ts first
bun run publish:yaak                  # bump packages/yaak-plugin/package.json first
# then, by the account owner (2FA — see "Registry quirks"):
npm publish packages/tokens --provenance=false   # bump packages/tokens/package.json first
```

herdr reads its fragment straight from this repo, but tuicr does not: `apply.sh`
*copies* the active mood's theme into `~/.config/tuicr/themes/`, so a release
that changes tuicr colours reaches it only when `apply-mood` runs again (it also
runs on every mood switch). Inactive moods stay stale until they are selected.

delta is the one file-synced host with a second step after the sync: its
fragment is only read if `~/.gitconfig` includes it, so
`sync-hue-delta.sh` writes `~/.config/git/hue-themes/` and the include plus
`[delta] features = hue` are set once by hand. Confirm with `delta --show-config
| grep plus-style`, not by reading the synced file — a syntax error anywhere in
the fragment makes delta exit rather than fall back.

## Version numbers are independent

Four separate number lines, easy to conflate in conversation:

- the repository tag (`vX.Y.Z`) — set by `release-all.sh`, marks a commit
- the Inkdrop theme package version — hardcoded in `adapters/inkdrop.ts`
- the Yaak plugin version — hardcoded in `packages/yaak-plugin/package.json`
- the token package version — hardcoded in `packages/tokens/package.json`

The bundle's own `version` field inside `themes.json` (`BUNDLE_VERSION` in
`src/bundle.ts`) is a fifth, but it versions the file format, not a release —
leave it alone unless the bundle's shape changes.

No registry serves an update without its own version moving, and no number is
bumped by the token build. This is the failure that hides best: the
build succeeds, the artifacts are correct on disk, and users see nothing change.

## Verify against the host, not the filesystem

Both registries reinstall over local edits on their own schedule, so a file you
changed by hand in an install directory proves nothing — it will be reverted.
Ask the host where it installed from:

```fish
# Yaak — the url column names the registry version it is pinned to
sqlite3 ~/Library/Application\ Support/app.yaak.desktop/db.sqlite \
  "select url, source from plugins where directory like '%hue%';"

# Inkdrop — confirm which profile the running app uses before reading packages/
lsof -p (pgrep -f Inkdrop | head -1) | grep -oE "Application Support/inkdrop[^/]*"
```

For the file-synced hosts the trap is different: the sync scripts fetch from
`raw.githubusercontent.com`, whose CDN serves a cached copy for a while after a
push. Pass `--ref (git rev-parse HEAD)` and check a hex that changed in that
commit.

ChatGPT/Codex is copy/paste distribution rather than an installable plugin.
Copy the complete generated share string, import it into the matching Dark or
Light card, and verify the colors in the running app. The app has one custom
slot per variant, so importing Hương after Mưa replaces the dark theme.

## Registry quirks

Each of these stopped a release once. None of them is visible from a green CI run.

**ipm (Inkdrop).** `ipm publish` runs the package's `prepublishOnly` hook through
`/bin/sh` without `node_modules/.bin` on `PATH`, so `generate-palette` is not
found. `scripts/publish-inkdrop.sh` prepends the package's bin directory; call
`ipm publish` through the script, not directly. The hook regenerates each
package's `palette.json` — commit those after a publish. Installed themes update
on Inkdrop's own schedule; `ipm install hue-<mood>-theme` pulls a new version
immediately.

**Yaak registry.** The registry fetches every image in the plugin README at
publish time and rejects SVG (`only PNG, JPEG, GIF and WebP raster images are
supported`), which is why the README logo is `design/hue-mark.png`. The rule
is newer than the plugin — 0.3.0 shipped with the SVG logo — so a README that
published before can be refused now. Keep README images raster and small. If an upload fails with `Application failed to
respond`, check whether the version landed before retrying — the read API
answers even when uploads do not:

```fish
curl -s https://api.yaak.app/api/v1/plugins/@crafts69guy/hue-theme \
  | python3 -c "import json,sys; print(json.load(sys.stdin)['version'])"
```

**npm.** The account has two-factor auth, so `npm login` and `npm publish` are
interactive and have to be run by the owner. `publishConfig.provenance` is
`true`, which only works from CI with OIDC; there is no publish workflow, so a
local publish needs `--provenance=false` (0.1.0 and 0.2.0 both shipped without
attestations). A successful publish answers `202` and the registry keeps
serving the previous `latest` for about half a minute. Confirm against the
registry rather than `npm view`, which can answer from its local cache:

```fish
curl -s https://registry.npmjs.org/@crafts69guy%2fhue-theme-tokens \
  | python3 -c "import json,sys; print(json.load(sys.stdin)['dist-tags'])"
```

