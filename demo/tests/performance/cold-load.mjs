import { chromium } from "@playwright/test";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { gzipSync } from "node:zlib";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const baseURL =
  process.env.PLAYWRIGHT_BASE_URL || "http://127.0.0.1:4173/loom-public/";
const artifact = resolve(
  process.argv[2] || fileURLToPath(new URL("../../dist/", import.meta.url)),
);
const output = fileURLToPath(
  new URL("../../../.local/visual-review/cold-load.json", import.meta.url),
);
const browser = await chromium.launch();
const runs = [];
try {
  for (let run = 0; run < 3; run++) {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 1,
      locale: "en-US",
      timezoneId: "America/New_York",
      reducedMotion: "reduce",
    });
    const page = await context.newPage();
    await page.goto(baseURL);
    await page
      .getByRole("heading", { name: "All store orders", exact: true })
      .waitFor();
    await page.evaluate(
      () =>
        new Promise((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(resolve)),
        ),
    );
    const measurement = await page.evaluate(() => {
      const nav = performance.getEntriesByType("navigation")[0];
      return {
        ordersReadyMs: performance.now(),
        domContentLoadedMs: nav.domContentLoadedEventEnd,
        loadEventMs: nav.loadEventEnd,
        firstContentfulPaintMs:
          performance.getEntriesByName("first-contentful-paint")[0]
            ?.startTime ?? null,
        resources: performance.getEntriesByType("resource").map((entry) => ({
          url: entry.name,
          encodedBytes: entry.encodedBodySize,
          transferBytes: entry.transferSize,
        })),
      };
    });
    const scripts = measurement.resources.filter((resource) =>
      new URL(resource.url).pathname.endsWith(".js"),
    );
    let initialJavaScriptGzipBytes = 0;
    for (const script of scripts) {
      const asset = new URL(script.url).pathname.replace(
        new URL(baseURL).pathname,
        "",
      );
      if (!/^assets\/[A-Za-z0-9._-]+\.js$/.test(asset))
        throw new Error("Unexpected script asset path.");
      initialJavaScriptGzipBytes += gzipSync(
        await readFile(resolve(artifact, asset)),
      ).length;
    }
    runs.push({
      ...measurement,
      initialJavaScriptGzipBytes,
      exporterLoaded: scripts.some((script) =>
        /exceljs|jspdf|pptxgen|html2canvas/.test(script.url),
      ),
    });
    await context.close();
  }
  const result = {
    browser: await browser.version(),
    node: process.version,
    platform: process.platform,
    conditions:
      "Three fresh Chromium contexts; 1440×900 CSS pixels; device scale 1; local production preview; no CPU/network throttling. Lab measurements only, not field Core Web Vitals.",
    runs,
  };
  await mkdir(dirname(output), { recursive: true });
  await writeFile(output, JSON.stringify(result, null, 2) + "\n");
  console.log(JSON.stringify(result, null, 2));
} finally {
  await browser.close();
}
