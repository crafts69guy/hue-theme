import { describe, expect, test } from "bun:test";
import { themeBundle } from "../packages/tokens/generated/themes";
import { textOn, tray, wash } from "../packages/tokens/src/derive";
import {
  contrastFailures,
  contrastGates,
  derivedFailures,
  RECEDING_SYNTAX,
} from "../packages/tokens/src/gates";

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

  test("every shipped mood clears every derived-colour floor", () => {
    for (const theme of themeBundle.themes) expect(derivedFailures(theme)).toEqual([]);
  });
});

describe("derived colours", () => {
  test("textOn picks whichever of canvas and primary text reads better", () => {
    for (const theme of themeBundle.themes) {
      const s = theme.semantic;
      expect([s["surface.canvas"], s["text.primary"]]).toContain(
        textOn(theme, s["status.warning"]),
      );
      expect(textOn(theme, s["surface.canvas"])).toBe(s["text.primary"]);
    }
  });

  test("wash and tray stay between their endpoints", () => {
    for (const theme of themeBundle.themes) {
      const s = theme.semantic;
      expect(wash(theme, "status.error", 0)).toBe(s["surface.canvas"]);
      expect(wash(theme, "status.error", 1)).toBe(s["status.error"]);
      expect([s["surface.canvas"], s["surface.raised"]]).not.toContain(tray(theme));
    }
  });
});
