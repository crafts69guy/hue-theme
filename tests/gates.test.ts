import { describe, expect, test } from "bun:test";
import { themeBundle } from "../packages/tokens/generated/themes";
import { contrastFailures, contrastGates, RECEDING_SYNTAX } from "../packages/tokens/src/gates";

describe("contrast gates", () => {
  test("every shipped mood clears every gate", () => {
    for (const theme of themeBundle.themes) {
      expect(contrastFailures(theme.id, theme.semantic)).toEqual([]);
    }
  });

  test("covers every status and syntax role, not a hand-picked few", () => {
    const keys = Object.keys(themeBundle.themes[0].semantic);
    const gated = new Set(contrastGates(keys).map((gate) => gate.fg));
    for (const key of keys.filter((k) => k.startsWith("status.") || k.startsWith("syntax."))) {
      expect(gated.has(key)).toBe(true);
    }
  });

  // The receding exception is documented, so it must stay exactly this narrow.
  test("holds only comments and punctuation to the receding floor", () => {
    const keys = Object.keys(themeBundle.themes[0].semantic);
    const receding = contrastGates(keys)
      .filter(
        (gate) =>
          gate.bg === "surface.canvas" && gate.minimum < 4.5 && gate.fg.startsWith("syntax."),
      )
      .map((gate) => gate.fg);
    expect(receding).toEqual([...RECEDING_SYNTAX]);
  });

  // Regression: Cung's selection shipped at 1.29:1 and could not be found.
  test("rejects a selection that does not stand off the canvas", () => {
    const mood = { ...themeBundle.themes[0].semantic, "surface.selected": "#E4ECFA" };
    expect(contrastFailures("probe", mood).join("\n")).toContain(
      "surface.selected on surface.canvas",
    );
  });

  test("rejects a comment that falls below the receding floor", () => {
    const mood = { ...themeBundle.themes[0].semantic, "syntax.comment": "#7D96C1" };
    expect(contrastFailures("probe", mood).join("\n")).toContain(
      "syntax.comment on surface.canvas",
    );
  });
});
