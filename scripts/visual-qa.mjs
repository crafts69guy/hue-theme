import { chromium } from "playwright";

const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: 1536, height: 1024 },
  deviceScaleFactor: 1,
});
const errors = [];
page.on("console", (message) => {
  if (message.type() === "error") errors.push(message.text());
});
page.on("pageerror", (error) => errors.push(error.message));

await page.goto("http://127.0.0.1:5173", { waitUntil: "networkidle" });
const title = await page.locator("h1").innerText();
if (!title.includes("1 chút Huế")) throw new Error("Hero title is missing");

for (const theme of ["Mưa", "Hương", "Cung"]) {
  await page.getByRole("button", { name: theme }).click();
  const themeId = theme === "Mưa" ? "mua" : theme === "Hương" ? "huong" : "cung";
  if ((await page.locator(".app").getAttribute("data-hue-theme")) !== themeId) {
    throw new Error(`${theme} mood switch did not update the active theme`);
  }

  const activeBackground = page.locator(".hero-background img.active");
  if ((await activeBackground.getAttribute("src")) !== `/images/hero-${themeId}.webp`) {
    throw new Error(`${theme} hero background did not become active`);
  }
  if (!(await activeBackground.evaluate((image) => image.complete && image.naturalWidth > 0))) {
    throw new Error(`${theme} hero background failed to load`);
  }
  await page
    .locator(`.hero-background canvas.ready[data-rendered-theme="${themeId}"]`)
    .waitFor({ state: "visible" });
  await page.waitForTimeout(250);

  const failedAudits = await page.locator(".audit-row .fail").count();
  if (failedAudits !== 0) throw new Error(`${theme} has ${failedAudits} contrast rows failed`);

  await page.screenshot({
    path: `/private/tmp/hue-theme-${themeId}-render.png`,
    fullPage: true,
  });
}

await page.setViewportSize({ width: 390, height: 844 });
await page.reload({ waitUntil: "networkidle" });
for (const theme of ["Mưa", "Hương", "Cung"]) {
  await page.getByRole("button", { name: theme }).click();
  const themeId = theme === "Mưa" ? "mua" : theme === "Hương" ? "huong" : "cung";
  await page
    .locator(`.hero-background canvas.ready[data-rendered-theme="${themeId}"]`)
    .waitFor({ state: "visible" });
  await page.waitForTimeout(250);
  const bodyWidth = await page.locator("body").evaluate((element) => element.scrollWidth);
  if (bodyWidth > 390) throw new Error(`${theme} mobile page overflows to ${bodyWidth}px`);
  await page.screenshot({
    path: `/private/tmp/hue-theme-${themeId}-mobile-render.png`,
    fullPage: false,
  });
}

if (errors.length > 0) {
  throw new Error(`Browser console errors:\n${errors.join("\n")}`);
}

console.log(
  "Visual QA passed: three hero backgrounds, mood interaction, AA rows, and mobile layout.",
);
await browser.close();
