import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { test, expect, openRoute, noHorizontalPageOverflow } from "./helpers";

const screens = [
  ["01-orders-activity", "/orders"],
  ["02-purchase-options", "/products/daily-greens"],
  ["03-scheduling", "/scheduling"],
  ["04-analytics-overview", "/analytics"],
  ["05-custom-reports", "/reports"],
  ["06-automations", "/automations"],
  ["07-loom-ai", "/insights"],
] as const;

// Every target is a viewport/emulation check, never a physical-device claim.
for (const [width, height] of [
  [320, 812],
  [375, 812],
  [390, 844],
  [768, 1024],
  [1024, 768],
  [1440, 900],
  [1920, 1080],
]) {
  test(`seven views reflow at ${width} × ${height}`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    for (const [, route] of screens) {
      await openRoute(page, route);
      await expect(
        page.locator("main section").first(),
        "The route must render populated content, not only the shared shell",
      ).toBeVisible();
      await noHorizontalPageOverflow(page);
      await expect(page.getByRole("heading", { level: 1 })).toBeInViewport();
    }
  });
}

test("seven populated view captures for visual review", async ({
  page,
}, testInfo) => {
  const size = testInfo.project.name.includes("mobile") ? "mobile" : "desktop";
  const destination = testInfo.outputPath("captures");
  await mkdir(destination, { recursive: true });
  for (const [name, route] of screens) {
    await openRoute(page, route);
    await expect(page.locator("main section").first()).toBeVisible();
    await page.screenshot({
      path: resolve(destination, `${name}-${size}.png`),
      fullPage: true,
      animations: "disabled",
    });
  }
});

test("two-hundred-percent text remains reachable without page overflow", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  for (const [, route] of screens) {
    await openRoute(page, route);
    // Hash navigation preserves the document: reload so each route gets 200%, not 400%, 800%, etc.
    await page.reload();
    await expect(
      page.getByText("Opening workspace…", { exact: true }),
    ).toHaveCount(0);
    await expect(page.locator("main section").first()).toBeVisible();
    // Freeze each original computed size first so nested elements are doubled once.
    await page.evaluate(() => {
      const elements = [
        ...document.querySelectorAll<HTMLElement>("body, body *"),
      ].filter((el) => el.namespaceURI === "http://www.w3.org/1999/xhtml");
      const sizes = elements.map((el) =>
        Number.parseFloat(getComputedStyle(el).fontSize),
      );
      elements.forEach((el, index) => {
        if (Number.isFinite(sizes[index]))
          el.style.fontSize = `${sizes[index] * 2}px`;
      });
    });
    await noHorizontalPageOverflow(page);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  }
});

test("long automation names and open action menus remain usable at 375 pixels", async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await openRoute(page, "/automations/new");
  const name =
    "Quarterly subscription and fulfillment performance review for sample merchant";
  await page.getByLabel("Automation name", { exact: true }).fill(name);
  await page
    .getByRole("button", { name: "Save automation", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Edit automation", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Close automation editor" }).click();
  await page.getByLabel("Search automations").fill(name);
  await noHorizontalPageOverflow(page);
  const actions = page.getByRole("button", {
    name: `Actions for ${name}`,
    exact: true,
  });
  await actions.click();
  const menu = page.getByRole("menu", { name: "Automation actions" });
  await expect(menu).toBeInViewport();
  await page.keyboard.press("Escape");
  await expect(menu).toHaveCount(0);
  await expect(actions).toBeFocused();
  await page
    .getByLabel("Search automations")
    .fill("no matching local automation");
  await expect(
    page.getByRole("heading", { name: "No automations match" }),
  ).toBeVisible();
});
