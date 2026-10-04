import { test as base, expect, type Page } from "@playwright/test";

/** Every journey gets a fresh context; no broad origin cleanup is necessary. */
export const test = base.extend<{ runtimeAudit: void }>({
  runtimeAudit: [
    async ({ page, baseURL }, use) => {
      const failures: string[] = [];
      const origin = new URL(baseURL!).origin;
      page.on("pageerror", (error) =>
        failures.push(`Uncaught: ${error.message}`),
      );
      page.on("console", (message) => {
        if (message.type() === "error" || message.type() === "warning")
          failures.push(`Console ${message.type()}: ${message.text()}`);
      });
      page.on("request", (request) => {
        if (
          /^https?:/.test(request.url()) &&
          new URL(request.url()).origin !== origin
        )
          failures.push(`External request: ${request.url()}`);
      });
      page.on("response", (response) => {
        if (response.status() >= 400)
          failures.push(`HTTP ${response.status()}: ${response.url()}`);
      });
      page.on("requestfailed", (request) => {
        // Normal route changes can abort an in-flight lazy module. Other failures are defects.
        if (
          !/ERR_ABORTED|NS_BINDING_ABORTED|cancelled/i.test(
            request.failure()?.errorText || "",
          )
        )
          failures.push(`Request failed: ${request.url()}`);
      });
      await use();
      expect(
        failures,
        "No runtime warnings/errors, missing required assets, or external runtime requests",
      ).toEqual([]);
    },
    { auto: true },
  ],
});
export { expect };

export async function openRoute(page: Page, route = "/orders") {
  await page.goto(`./#${route}`);
  await expect(
    page.getByText("Interactive demo · Sample data · No live integrations", {
      exact: true,
    }),
  ).toBeVisible();
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(
    page.getByText("Opening workspace…", { exact: true }),
  ).toHaveCount(0);
}

export async function noHorizontalPageOverflow(page: Page) {
  const widths = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    page: document.documentElement.scrollWidth,
  }));
  expect(
    widths.page,
    "Page must reflow; dense tables may scroll within their own region",
  ).toBeLessThanOrEqual(widths.viewport + 1);
}

export async function mainNavigation(page: Page, label: string) {
  const navigation = page
    .getByRole("complementary", { name: "Main navigation" })
    .or(page.getByRole("dialog", { name: "Main navigation" }));
  const link = navigation.getByRole("link", { name: label, exact: true });
  const menu = page.getByRole("button", {
    name: "Open navigation",
    exact: true,
  });
  if (
    (await menu.isVisible()) &&
    !(await page.getByRole("dialog", { name: "Main navigation" }).isVisible())
  )
    await menu.click();
  await link.click();
}
