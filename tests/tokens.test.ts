import { describe, expect, test } from "bun:test";
import { themeBundle } from "../packages/tokens/generated/themes";

describe("Hue Theme token contract", () => {
  test("contains the three canonical moods", () => {
    expect(themeBundle.themes.map((theme) => theme.id)).toEqual([
      "cung",
      "huong",
      "mua",
    ]);
  });

  test("keeps semantic parity across moods", () => {
    const contracts = themeBundle.themes.map((theme) =>
      Object.keys(theme.semantic).sort(),
    );
    expect(contracts[1]).toEqual(contracts[0]);
    expect(contracts[2]).toEqual(contracts[0]);
  });

  test("uses light appearance only for Cung", () => {
    expect(
      Object.fromEntries(
        themeBundle.themes.map((theme) => [theme.id, theme.appearance]),
      ),
    ).toEqual({ cung: "light", huong: "dark", mua: "dark" });
  });
});
