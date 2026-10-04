import { defineConfig, devices } from "@playwright/test";
import { fileURLToPath } from "node:url";

// These reviewed baselines use the Windows renderer. Linux functional CI does not compare them.
if (process.platform !== "win32")
  throw new Error(
    "The reviewed visual baselines require Windows and the locked Playwright Chromium version. Run the cross-browser functional suite on other platforms.",
  );
const baseURL =
  process.env.PLAYWRIGHT_BASE_URL || "http://127.0.0.1:4173/loom-public/";
export default defineConfig({
  testDir: "./tests/visual",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  forbidOnly: true,
  outputDir: "./test-results/visual",
  snapshotPathTemplate: fileURLToPath(
    new URL("../docs/demo-images/{arg}{ext}", import.meta.url),
  ),
  updateSnapshots: "none",
  reporter: "list",
  use: {
    baseURL,
    locale: "en-US",
    timezoneId: "America/New_York",
    colorScheme: "light",
    reducedMotion: "reduce",
    deviceScaleFactor: 1,
  },
  projects: [
    {
      name: "desktop",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1440, height: 900 },
        deviceScaleFactor: 1,
      },
    },
    {
      name: "mobile",
      use: {
        ...devices["iPhone 13"],
        defaultBrowserType: "chromium",
        viewport: { width: 390, height: 844 },
        deviceScaleFactor: 1,
      },
    },
  ],
  expect: { toHaveScreenshot: { animations: "disabled", maxDiffPixels: 0 } },
  webServer: process.env.PLAYWRIGHT_BASE_URL
    ? undefined
    : {
        command: "npm run build && npm run preview -- --port 4173 --strictPort",
        url: baseURL,
        reuseExistingServer: true,
        timeout: 120_000,
      },
});
