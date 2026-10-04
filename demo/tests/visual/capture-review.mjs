import { chromium, devices } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

// Capture review candidates separately. Only inspected, approved images become baselines.
const baseURL =
  process.env.PLAYWRIGHT_BASE_URL || "http://127.0.0.1:4173/loom-public/";
const output = resolve(
  process.argv[2] || "../.local/visual-review/final-candidate",
);
const screens = [
  ["01-orders-activity", "/orders"],
  ["02-purchase-options", "/products/daily-greens"],
  ["03-scheduling", "/scheduling"],
  ["04-analytics-overview", "/analytics"],
  ["05-custom-reports", "/reports"],
  ["06-automations", "/automations"],
  ["07-loom-ai", "/insights"],
];
const projects = [
  [
    "desktop",
    { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } },
  ],
  [
    "mobile",
    {
      ...devices["iPhone 13"],
      defaultBrowserType: "chromium",
      viewport: { width: 390, height: 844 },
    },
  ],
];
const browser = await chromium.launch();
await mkdir(output, { recursive: true });
try {
  for (const [project, device] of projects) {
    for (const [name, route] of screens) {
      const context = await browser.newContext({
        ...device,
        locale: "en-US",
        timezoneId: "America/New_York",
        colorScheme: "light",
        reducedMotion: "reduce",
        deviceScaleFactor: 1,
      });
      const page = await context.newPage();
      await page.goto(`${baseURL}#${route}`);
      await page.locator("h1").waitFor();
      await page.locator("main section").first().waitFor();
      await page
        .getByText("Opening workspace…", { exact: true })
        .waitFor({ state: "hidden" });
      await page.evaluate(() => document.fonts.ready);
      await page.screenshot({
        path: resolve(output, `${name}-${project}.png`),
        fullPage: true,
        animations: "disabled",
        caret: "hide",
      });
      await context.close();
    }
  }
  await writeFile(
    resolve(output, "capture-context.json"),
    JSON.stringify(
      {
        browser: browser.version(),
        platform: process.platform,
        baseURL,
        deviceScaleFactor: 1,
        locale: "en-US",
        timezoneId: "America/New_York",
        colorScheme: "light",
        reducedMotion: "reduce",
        screenshots: 14,
      },
      null,
      2,
    ) + "\n",
  );
  console.log(`Captured 14 review candidates in ${output}`);
} finally {
  await browser.close();
}
