import { test, expect, openRoute, mainNavigation } from "./helpers";

test("cancelling blocked Back preserves history and discarding consumes the intended entry once", async ({
  page,
}) => {
  await openRoute(page, "/orders");
  await mainNavigation(page, "Products");
  await page
    .getByRole("link", { name: /Daily Greens Powder, sample packaging/ })
    .click();
  await page.getByLabel("Discount (%)", { exact: true }).fill("20");
  await page.goBack();
  const guard = page.getByRole("dialog", { name: "Discard unsaved changes?" });
  await expect(guard).toBeVisible();
  await expect(page).toHaveURL(/#\/products\/daily-greens$/);
  await guard
    .getByRole("button", { name: "Keep editing", exact: true })
    .click();
  await expect(page.getByLabel("Discount (%)", { exact: true })).toHaveValue(
    "20",
  );
  await page.goBack();
  await expect(guard).toBeVisible();
  await guard
    .getByRole("button", { name: "Discard changes", exact: true })
    .click();
  await expect(page).toHaveURL(/#\/products$/);
  await expect(
    page.getByRole("heading", { name: "Product catalog", exact: true }),
  ).toBeVisible();
  await page.goBack();
  await expect(page).toHaveURL(/#\/orders$/);
  await page.goForward();
  await expect(page).toHaveURL(/#\/products$/);
  await page.goForward();
  await expect(page).toHaveURL(/#\/products\/daily-greens$/);
  await expect(page.getByLabel("Discount (%)", { exact: true })).toHaveValue(
    "10",
  );
});
