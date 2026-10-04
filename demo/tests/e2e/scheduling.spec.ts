import { test, expect, openRoute } from "./helpers";
import { STORAGE_KEY } from "../../src/persistence";

test("schedule preview cancels without mutation, rejects blackout dates, and applies one valid move", async ({
  page,
}) => {
  await openRoute(page, "/scheduling");
  await expect(
    page.getByText("4 orders requiring action", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Simulate changes", exact: true })
    .click();
  const dialog = page.getByRole("dialog", {
    name: "Simulate a schedule change",
  });
  await expect(
    dialog.getByRole("button", { name: "Apply to demo", exact: true }),
  ).toBeDisabled();
  const number = await dialog
    .locator(".schedule-move-list strong")
    .first()
    .innerText();
  const beforeStorage = await page.evaluate(
    (key) => localStorage.getItem(key),
    STORAGE_KEY,
  );
  await dialog.getByRole("button", { name: "Preview changes" }).click();
  await expect(
    dialog.getByText("Proposed change — not applied", { exact: true }),
  ).toBeVisible();
  await dialog.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(
    page.getByText("4 orders requiring action", { exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate((key) => localStorage.getItem(key), STORAGE_KEY),
  ).toBe(beforeStorage);
  await page
    .getByRole("button", { name: "Simulate changes", exact: true })
    .click();
  await dialog.getByLabel("Proposed fulfillment date").fill("2026-12-25");
  await dialog.getByRole("button", { name: "Preview changes" }).click();
  await expect(dialog.getByRole("alert")).toContainText(/blackout/i);
  await expect(
    dialog.getByRole("button", { name: "Apply to demo", exact: true }),
  ).toBeDisabled();
  await dialog.getByLabel("Proposed fulfillment date").fill("2026-12-29");
  await dialog.getByRole("button", { name: "Preview changes" }).click();
  await dialog
    .getByRole("button", { name: "Apply to demo", exact: true })
    .click();
  await expect(dialog).toHaveCount(0);
  await expect(
    page.getByText("3 orders requiring action", { exact: true }),
  ).toBeVisible();
  const saved = await page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key)!),
    STORAGE_KEY,
  );
  const moved = saved.orders.find(
    (order: { number: string }) => order.number === number,
  );
  expect(moved.fulfillmentDate).toBe("2026-12-29");
  expect(moved.billingDate).toBe("2026-12-08");
  expect(moved.deliveryDate).toBe("2027-01-01");
  expect(
    saved.activity.filter((event: { message: string }) =>
      event.message.includes("rescheduled"),
    ),
  ).toHaveLength(1);
  await page.reload();
  await expect(
    page.getByText("3 orders requiring action", { exact: true }),
  ).toBeVisible();
});

test("calendar month boundaries and rule edits have explicit cancel/apply behavior", async ({
  page,
  isMobile,
}) => {
  await openRoute(page, "/scheduling");
  if (isMobile)
    await page
      .getByRole("button", { name: "Show calendar", exact: true })
      .click();
  const calendar = page.getByRole("group", {
    name: "December 2026 fulfillment calendar",
  });
  await expect(calendar.getByRole("button")).toHaveCount(31);
  await page.getByRole("button", { name: "Next schedule month" }).click();
  await expect(page).toHaveURL(/month=2027-01/);
  await expect(
    page
      .getByRole("group", { name: "January 2027 fulfillment calendar" })
      .getByRole("button"),
  ).toHaveCount(31);
  await page.getByRole("button", { name: "Previous schedule month" }).click();
  await page
    .getByRole("button", { name: /Scheduling rules Set lead times/ })
    .click();
  const rules = page.getByRole("dialog", { name: "Demo scheduling rules" });
  await rules.getByLabel("Daily capacity").fill("12");
  await rules.getByRole("button", { name: "Cancel", exact: true }).click();
  await page
    .getByRole("dialog", { name: "Discard rule changes?" })
    .getByRole("button", { name: "Discard changes" })
    .click();
  await expect(
    page.getByText("Daily capacity: 10", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: /Scheduling rules Set lead times/ })
    .click();
  await rules.getByLabel("Daily capacity").fill("12");
  await rules.getByLabel("Add blackout date").fill("2026-12-24");
  await rules.getByRole("button", { name: "Add date", exact: true }).click();
  await rules.getByRole("button", { name: "Apply rules to demo" }).click();
  await expect(
    page.getByText("Daily capacity: 12", { exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByText("Daily capacity: 12", { exact: true }),
  ).toBeVisible();
});
