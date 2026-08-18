# How themes reach users

Ten hosts, four channels. The channel is not obvious from the package layout, and
guessing it wrong is how the Yaak theme sat three months stale — a script named
`release-yaak.sh` pushes source to GitHub, but Yaak installs from its own
registry, so "releasing" it reached nobody.

| Host | Channel | Publish with | Confirm it landed |
| --- | --- | --- | --- |
| Neovim | git subtree → `crafts69guy/hue-nvim` | `scripts/release-nvim.sh --tag vX.Y.Z` | `git ls-remote --tags` on that repo |
| tmux | git subtree → `crafts69guy/hue-tmux` | `scripts/release-tmux.sh --tag vX.Y.Z` | same |
| Yaak | **Yaak plugin registry** | `bun run publish:yaak` | the `plugins` row in Yaak's `db.sqlite` |
| Inkdrop | **ipm registry** | `bun run publish:inkdrop` | `ipm search hue` |
| Ghostty, bat, lazygit | local files fetched over HTTPS | `~/.scripts/sync-hue-*.sh --ref <SHA>` | grep a changed hex out of the written file |
| herdr, tuicr | local plugin path | nothing to publish | `~/.config/herdr/config.toml` |
| Fish / Tide | sourced from a working copy | nothing to publish | `hue-theme <mood>` |

`scripts/release-all.sh` covers only the first two rows plus the Yaak *source*
mirror. It does not publish to either registry. A full release is:

```fish
bun run --cwd packages/tokens build
bun run ci
scripts/release-all.sh --tag vX.Y.Z   # subtrees + tags this repo
bun run publish:inkdrop               # bump adapters/inkdrop.ts first
bun run publish:yaak                  # bump packages/yaak-plugin/package.json first
```

## Version numbers are independent

Three separate number lines, easy to conflate in conversation:

- the repository tag (`vX.Y.Z`) — set by `release-all.sh`, marks a commit
- the Inkdrop theme package version — hardcoded in `adapters/inkdrop.ts`
- the Yaak plugin version — hardcoded in `packages/yaak-plugin/package.json`

Neither registry serves an update without its own version moving, and neither
number is bumped by the token build. This is the failure that hides best: the
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
