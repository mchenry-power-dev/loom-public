import { test, expect, openRoute, mainNavigation } from "./helpers";
import { STORAGE_KEY } from "../../src/persistence";

test("subscription pause, resume and skip are confirmed and survive refresh", async ({
  page,
}) => {
  await openRoute(page, "/subscriptions/sub-1?q=Daily+Greens&status=Active");
  await expect(
    page.getByRole("heading", { name: "SUB-1", exact: true }),
  ).toBeVisible();
  await expect(page.getByText("Every 4 weeks", { exact: true })).toBeVisible();
  await page
    .getByRole("button", { name: "Pause in demo", exact: true })
    .click();
  await page
    .getByRole("dialog", { name: "Pause sample subscription" })
    .getByRole("button", { name: "Cancel", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Pause in demo", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Pause in demo", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Apply to demo", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Skip next occurrence", exact: true }),
  ).toBeDisabled();
  await page
    .getByRole("button", { name: "Back to subscriptions", exact: true })
    .click();
  await expect(page.getByLabel("Search subscriptions")).toHaveValue(
    "Daily Greens",
  );
  await expect(page.getByLabel("Subscription status")).toHaveValue("Active");
  await openRoute(page, "/subscriptions/sub-1");
  await page
    .getByRole("button", { name: "Resume in demo", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Apply to demo", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Skip next occurrence", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toContainText("Dec 31, 2026");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Apply to demo", exact: true })
    .click();
  await page.reload();
  await expect(page.getByText("Dec 31, 2026", { exact: true })).toBeVisible();
});

test("a future contract skip moves its corresponding fulfillment by monthly cadence", async ({
  page,
  isMobile,
}) => {
  await openRoute(page, "/subscriptions/sub-schedule-10-10");
  await expect(
    page.getByRole("heading", { name: "Daily Greens Powder", exact: true }),
  ).toBeVisible();
  await expect(page.getByText("Dec 10, 2026", { exact: true })).toBeVisible();
  await page
    .getByRole("button", { name: "Skip next occurrence", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Apply to demo", exact: true })
    .click();
  await expect(page.getByText("Jan 10, 2027", { exact: true })).toBeVisible();
  const state = await page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key)!),
    STORAGE_KEY,
  );
  const order = state.orders.find(
    (item: { id: string }) => item.id === "schedule-10-10",
  );
  expect(order.fulfillmentDate).toBe("2027-01-10");
  expect(order.billingDate).toBe("2027-01-08");
  expect(order.deliveryDate).toBe("2027-01-13");
  await openRoute(page, "/scheduling");
  await expect(
    page.getByText("3 orders requiring action", { exact: true }),
  ).toBeVisible();
  if (isMobile) {
    await page.getByLabel("Inspect any day").fill("2027-01-10");
  } else {
    await page.getByRole("button", { name: "Next schedule month" }).click();
    await page
      .getByRole("button", { name: /^Jan 10, 2027: 1 scheduled/ })
      .click();
  }
  await expect(
    page.getByRole("dialog", { name: "Jan 10, 2027" }),
  ).toContainText("#D1010");
});

test("cancellation category persists and unsaved edits are protected on global navigation", async ({
  page,
}) => {
  await openRoute(page, "/cancellations/sub-44");
  await page
    .getByLabel("Cancellation reason")
    .selectOption("Delivery frequency");
  await mainNavigation(page, "Products");
  const guard = page.getByRole("dialog", {
    name: "Discard unsaved category change?",
  });
  await expect(guard).toBeVisible();
  await guard
    .getByRole("button", { name: "Keep editing", exact: true })
    .click();
  await expect(page.getByLabel("Cancellation reason")).toHaveValue(
    "Delivery frequency",
  );
  await page
    .getByRole("button", { name: "Save category", exact: true })
    .click();
  await page.reload();
  await expect(page.getByLabel("Cancellation reason")).toHaveValue(
    "Delivery frequency",
  );
  await page.getByLabel("Cancellation reason").selectOption("Other");
  await mainNavigation(page, "Products");
  await guard
    .getByRole("button", { name: "Discard and leave", exact: true })
    .click();
  await expect(page).toHaveURL(/#\/products$/);
  await openRoute(page, "/cancellations/sub-44");
  await expect(page.getByLabel("Cancellation reason")).toHaveValue(
    "Delivery frequency",
  );
  await page.getByLabel("Cancellation reason").selectOption("Other");
  await page
    .getByRole("button", { name: "Back to cancellations", exact: true })
    .first()
    .click();
  await guard
    .getByRole("button", { name: "Discard and leave", exact: true })
    .click();
  await expect(page).toHaveURL(/#\/cancellations$/);
});
