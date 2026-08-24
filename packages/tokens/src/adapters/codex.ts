// Hue -> ChatGPT/Codex desktop app adapter. Emits one share string per mood for
// Settings -> Appearance -> Import. The app derives most chrome colors from a
// small seed and accepts only a built-in code-theme id, so unsupported contract
// roles are either deliberately derived by the host or omitted explicitly.

import type { AdapterManifest } from "../contract";

export const CODEX_THEME_PREFIX = "codex-theme-v1:";
export const CODEX_CODE_THEME_ID = "codex";

export const codexManifest = {
  supports: ["surface", "text", "accent", "status"],
  omits: {
    border: "ChatGPT/Codex derives borders from its contrast setting",
    syntax: "ChatGPT/Codex share strings accept only a built-in code-theme id",
  },
} satisfies AdapterManifest;

export type ResolvedMood = {
  id: string;
  label: string;
  appearance: "dark" | "light";
  semantic: Record<string, string>;
};

export type CodexThemeSharePayload = {
  codeThemeId: typeof CODEX_CODE_THEME_ID;
  theme: {
    accent: string;
    contrast: number;
    fonts: { code: null; ui: null };
    ink: string;
    opaqueWindows: boolean;
    semanticColors: {
      diffAdded: string;
      diffRemoved: string;
      skill: string;
    };
    surface: string;
  };
  variant: "dark" | "light";
};

function role(mood: ResolvedMood, key: string): string {
  const value = mood.semantic[key];
  if (!value) throw new Error(`Mood ${mood.id} is missing semantic role ${key}`);
  return value;
}

/** Map one Hue mood onto the app's versioned theme-share payload. */
export function mapMoodToCodex(mood: ResolvedMood): CodexThemeSharePayload {
  return {
    codeThemeId: CODEX_CODE_THEME_ID,
    theme: {
      accent: role(mood, "accent.primary"),
      contrast: mood.appearance === "dark" ? 60 : 45,
      // The share schema requires font slots. null means the system default and
      // keeps Hue from imposing a font family on the user.
      fonts: { code: null, ui: null },
      ink: role(mood, "text.primary"),
      opaqueWindows: false,
      semanticColors: {
        diffAdded: role(mood, "status.success"),
        diffRemoved: role(mood, "status.error"),
        skill: role(mood, "accent.secondary"),
      },
      surface: role(mood, "surface.canvas"),
    },
    variant: mood.appearance,
  };
}

/** Render one complete value accepted by Appearance -> Import. */
export function renderCodexThemeShareString(mood: ResolvedMood): string {
  return `${CODEX_THEME_PREFIX}${JSON.stringify(mapMoodToCodex(mood))}\n`;
}

/** Render every mood as a plain copy/paste artifact. */
export function renderCodexThemeFiles(
  moods: ResolvedMood[],
): Array<{ path: string; content: string }> {
  return moods.map((mood) => ({
    path: `hue-${mood.id}.txt`,
    content: renderCodexThemeShareString(mood),
  }));
}
