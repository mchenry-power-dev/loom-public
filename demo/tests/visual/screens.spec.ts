import { test, expect, openRoute } from "../e2e/helpers";

const screens = [
  ["01-orders-activity", "/orders"],
  ["02-purchase-options", "/products/daily-greens"],
  ["03-scheduling", "/scheduling"],
  ["04-analytics-overview", "/analytics"],
  ["05-custom-reports", "/reports"],
  ["06-automations", "/automations"],
  ["07-loom-ai", "/insights"],
] as const;

for (const [name, route] of screens) {
  test(`${name} matches the reviewed capture`, async ({ page }, testInfo) => {
    await openRoute(page, route);
    await expect(page.locator("main section").first()).toBeVisible();
    await expect(page).toHaveScreenshot(
      `${name}-${testInfo.project.name}.png`,
      { fullPage: true },
    );
  });
}
