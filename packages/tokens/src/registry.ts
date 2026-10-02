// Every host adapter, declared once. The build validates each manifest and
// writes each adapter's files from this list, so adding a host is one entry
// here rather than an import, a validateManifest call and an outputs block in
// scripts/build.ts — the three places a new adapter used to be half-wired.

import { basename } from "node:path";
import { batManifest, renderBatFiles } from "./adapters/bat";
import { codexManifest, renderCodexThemeFiles } from "./adapters/codex";
import { deltaManifest, renderDeltaFiles } from "./adapters/delta";
import { ghosttyManifest, renderGhosttyFiles } from "./adapters/ghostty";
import { herdrManifest, renderHerdrFiles } from "./adapters/herdr";
import { inkdropManifest, renderInkdropPackages } from "./adapters/inkdrop";
import { lazygitManifest, renderLazygitFiles } from "./adapters/lazygit";
import { neovimManifest, renderNeovimFiles } from "./adapters/neovim";
import { renderTideFiles, tideManifest } from "./adapters/tide";
import { renderTmuxFiles, tmuxManifest } from "./adapters/tmux";
import { renderTuicrFiles, tuicrManifest } from "./adapters/tuicr";
import { renderYaakPluginSource, yaakManifest } from "./adapters/yaak";
import type { AdapterManifest } from "./contract";
import type { ResolvedMood } from "./mood";

export type OutputFile = { path: string; content: string };

export type Adapter = {
  /** The adapter's file name in src/adapters/, which is also the host name. */
  readonly name: string;
  readonly manifest: AdapterManifest;
  /** Package directory the paths are relative to, relative to packages/tokens. */
  readonly outDir: string;
  readonly render: (moods: readonly ResolvedMood[]) => OutputFile[];
};

export const ADAPTERS: readonly Adapter[] = [
  {
    name: "yaak",
    manifest: yaakManifest,
    outDir: "../yaak-plugin",
    render: (moods) => [{ path: "src/index.ts", content: renderYaakPluginSource(moods) }],
  },
  {
    name: "codex",
    manifest: codexManifest,
    outDir: "../codex-themes",
    render: renderCodexThemeFiles,
  },
  { name: "neovim", manifest: neovimManifest, outDir: "../nvim-plugin", render: renderNeovimFiles },
  {
    name: "ghostty",
    manifest: ghosttyManifest,
    outDir: "../terminal-themes",
    render: renderGhosttyFiles,
  },
  { name: "bat", manifest: batManifest, outDir: "../terminal-themes", render: renderBatFiles },
  {
    name: "lazygit",
    manifest: lazygitManifest,
    outDir: "../terminal-themes",
    render: renderLazygitFiles,
  },
  {
    name: "delta",
    manifest: deltaManifest,
    outDir: "../terminal-themes",
    render: renderDeltaFiles,
  },
  { name: "herdr", manifest: herdrManifest, outDir: "../herdr-plugin", render: renderHerdrFiles },
  {
    name: "tuicr",
    manifest: tuicrManifest,
    outDir: "../herdr-plugin",
    // The bat .tmTheme, copied in beside the tuicr theme that names it: tuicr
    // resolves `syntax_theme` relative to the theme file, so the pair has to
    // install together and the herdr-plugin package has to carry both.
    render: (moods) => [
      ...renderTuicrFiles(moods),
      ...renderBatFiles(moods).map((file) => ({
        path: `tuicr/${basename(file.path)}`,
        content: file.content,
      })),
    ],
  },
  { name: "tmux", manifest: tmuxManifest, outDir: "../tmux-plugin", render: renderTmuxFiles },
  { name: "tide", manifest: tideManifest, outDir: "../fish-themes", render: renderTideFiles },
  {
    name: "inkdrop",
    manifest: inkdropManifest,
    // One package per mood, each in its own packages/hue-<mood>-theme directory.
    outDir: "..",
    render: (moods) =>
      renderInkdropPackages(moods).flatMap((pack) =>
        pack.files.map((file) => ({
          path: `${pack.packagePath}/${file.path}`,
          content: file.content,
        })),
      ),
  },
];
