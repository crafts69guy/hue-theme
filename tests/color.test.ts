import { describe, expect, test } from "bun:test";
import { hexToRgb, hslChannels, mixHex, rgbToHex } from "../packages/tokens/src/color";

/** Inverse of hslChannels, for round-tripping only. */
function fromChannels(channels: string): [number, number, number] {
  const [h, s, l] = channels.match(/[\d.]+/g)?.map(Number) ?? [];
  const sat = s / 100;
  const light = l / 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = sat * Math.min(light, 1 - light);
  const f = (n: number) => light - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1));
  return [f(0), f(8), f(4)].map((v) => Math.round(v * 255)) as [number, number, number];
}

describe("colour math", () => {
  test("writes pure and grey colours as exact HSL channels", () => {
    expect(hslChannels("#000000")).toBe("0deg 0% 0%");
    expect(hslChannels("#FFFFFF")).toBe("0deg 0% 100%");
    expect(hslChannels("#FF0000")).toBe("0deg 100% 50%");
    expect(hslChannels("#00FF00")).toBe("120deg 100% 50%");
    expect(hslChannels("#0000FF")).toBe("240deg 100% 50%");
    expect(hslChannels("#FF00FF")).toBe("300deg 100% 50%");
  });

  // One decimal place of rounding must not move any channel by more than one
  // step, or a host reading the scale would draw a different colour than Hue
  // measured.
  test("round-trips through HSL channels within one sRGB step", () => {
    for (let i = 0; i < 400; i += 1) {
      const hex = rgbToHex([(i * 37) % 256, (i * 91) % 256, (i * 53) % 256]);
      const back = fromChannels(hslChannels(hex));
      hexToRgb(hex).forEach((channel, index) => {
        expect(Math.abs(channel - back[index])).toBeLessThanOrEqual(1);
      });
    }
  });

  test("mixHex weights toward the second colour", () => {
    expect(mixHex("#000000", "#FFFFFF", 0)).toBe("#000000");
    expect(mixHex("#000000", "#FFFFFF", 1)).toBe("#FFFFFF");
    expect(mixHex("#000000", "#FFFFFF", 0.5)).toBe("#808080");
  });
});
