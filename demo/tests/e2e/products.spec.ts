import { test, expect, openRoute, mainNavigation } from "./helpers";

test("purchase draft updates both previews, applies locally, persists, and adds a priced sample cart item", async ({
  page,
  isMobile,
}) => {
  await openRoute(page, "/products/daily-greens");
  await expect(
    page.getByRole("heading", { name: "Customer purchase options" }),
  ).toBeVisible();
  await expect(page.getByLabel("Enable prepaid plans")).not.toBeChecked();
  await expect(page.getByLabel("Prepaid deliveries")).toHaveCount(0);
  await page.getByLabel("Discount (%)", { exact: true }).fill("20");
  if (isMobile)
    await page
      .locator(".mobile-editor-tabs")
      .getByRole("button", { name: "Preview", exact: true })
      .click();
  await expect(page.getByText("$27.20", { exact: true })).toBeVisible();
  if (isMobile)
    await page
      .locator(".mobile-editor-tabs")
      .getByRole("button", { name: "Edit", exact: true })
      .click();
  await page.getByLabel("Discount (%)", { exact: true }).fill("10");
  await page
    .getByLabel("Default frequency", { exact: true })
    .selectOption("Monthly");
  if (isMobile)
    await page
      .locator(".mobile-editor-tabs")
      .getByRole("button", { name: "Preview", exact: true })
      .click();
  await expect(page.getByText("$30.60", { exact: true })).toBeVisible();
  await expect(page.getByLabel("Deliver every", { exact: true })).toHaveValue(
    "Monthly",
  );
  if (isMobile) await page.setViewportSize({ width: 1440, height: 900 });
  await page
    .getByRole("button", { name: "Desktop storefront preview", exact: true })
    .click();
  await expect(page.getByText("$30.60", { exact: true })).toBeVisible();
  await page
    .getByRole("button", { name: "Mobile storefront preview", exact: true })
    .click();
  await page.getByLabel("Preview device size").selectOption("430");
  if (isMobile) await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Save draft", exact: true }).click();
  await page
    .getByRole("button", { name: "Publish changes", exact: true })
    .click();
  await page
    .getByRole("dialog", { name: "Apply to demo store" })
    .getByRole("button", { name: "Apply to demo store", exact: true })
    .click();
  await page.reload();
  await expect(page.getByLabel("Discount (%)", { exact: true })).toHaveValue(
    "10",
  );
  await expect(
    page.getByLabel("Default frequency", { exact: true }),
  ).toHaveValue("Monthly");
  await page
    .getByRole("link", { name: "Preview storefront", exact: true })
    .click();
  await expect(page).toHaveURL(/#\/storefront\/daily-greens$/);
  await page.getByLabel("Quantity", { exact: true }).selectOption("2");
  await page
    .getByRole("button", { name: "Add to cart · $61.20", exact: true })
    .click();
  const cart = page.getByRole("dialog", { name: "Your sample cart" });
  await expect(cart.getByText("Daily Greens Powder × 2")).toBeVisible();
  await expect(cart.getByText("$61.20", { exact: true })).toBeVisible();
  await expect(
    cart.getByText("subscription · Monthly", { exact: true }),
  ).toBeVisible();
});

test("purchase validation, bounded prepaid setup, product isolation, and unsaved-edit cancel", async ({
  page,
}) => {
  await openRoute(page, "/products/daily-greens");
  await page.getByLabel("Enable one-time purchase").uncheck();
  await page.getByLabel("Enable Subscribe and Save").uncheck();
  await expect(page.getByRole("alert")).toContainText(/purchase option/i);
  await expect(
    page.getByRole("button", { name: "Publish changes", exact: true }),
  ).toBeDisabled();
  await page.getByLabel("Enable prepaid plans").check();
  await page.getByLabel("Prepaid deliveries").fill("15");
  await expect(page.getByRole("alert")).toBeVisible();
  await page.getByLabel("Prepaid deliveries").fill("3");
  await expect(page.getByRole("alert")).toHaveCount(0);
  await mainNavigation(page, "Settings");
  const guard = page.getByRole("dialog", { name: "Discard unsaved changes?" });
  await guard.getByRole("button", { name: "Keep editing" }).click();
  await expect(page.getByLabel("Enable prepaid plans")).toBeChecked();
  await mainNavigation(page, "Products");
  await guard.getByRole("button", { name: "Discard changes" }).click();
  await page.getByRole("link", { name: /Protein Shake Mix/ }).click();
  await expect(page.getByLabel("Enable prepaid plans")).not.toBeChecked();
  await expect(page.getByLabel("Discount (%)", { exact: true })).toHaveValue(
    "10",
  );
  await expect(page.getByLabel("Enable one-time purchase")).toBeChecked();
});
