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
await page.screenshot({
  path: "design/gallery-render.png",
  fullPage: true,
});

const title = await page.locator("h1").innerText();
if (!title.includes("Một hệ màu")) throw new Error("Hero title is missing");

await page.getByRole("button", { name: "Cung" }).click();
if ((await page.locator(".app").getAttribute("data-hue-theme")) !== "cung") {
  throw new Error("Cung mood switch did not update the active theme");
}
const failedAudits = await page.locator(".audit-row .fail").count();
if (failedAudits !== 0) throw new Error(`${failedAudits} contrast rows failed`);

await page.setViewportSize({ width: 390, height: 844 });
await page.reload({ waitUntil: "networkidle" });
const bodyWidth = await page.locator("body").evaluate((element) => element.scrollWidth);
if (bodyWidth > 390) throw new Error(`Mobile page overflows to ${bodyWidth}px`);
await page.screenshot({
  path: "design/gallery-mobile-render.png",
  fullPage: true,
});

if (errors.length > 0) {
  throw new Error(`Browser console errors:\n${errors.join("\n")}`);
}

console.log("Visual QA passed: mood interaction, AA rows, desktop and mobile layout.");
await browser.close();
