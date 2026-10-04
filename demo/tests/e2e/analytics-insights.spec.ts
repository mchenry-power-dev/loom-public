import { test, expect, openRoute } from "./helpers";
import { STORAGE_KEY } from "../../src/persistence";

test("analytics period, chart inspection, data alternative, and report context agree", async ({
  page,
}) => {
  await openRoute(page, "/analytics");
  const revenue = page.locator(".analytics-metric").first();
  const previousValue = await revenue
    .locator(".analytics-value strong")
    .innerText();
  await page.getByLabel("Analytics period", { exact: true }).selectOption("7d");
  await expect(revenue.locator(".analytics-value strong")).not.toHaveText(
    previousValue,
  );
  await expect(page.getByLabel("Inspect period").locator("option")).toHaveCount(
    7,
  );
  await page.getByLabel("Inspect period").selectOption("3");
  const inspected = await page.locator(".chart-inspector output").innerText();
  await page.getByText("View chart data", { exact: true }).click();
  await expect(
    page
      .locator(".chart-data")
      .getByRole("cell", { name: inspected, exact: true }),
  ).toBeVisible();
  await page.getByLabel("Compare to", { exact: true }).selectOption("none");
  await expect(revenue).toContainText("Selected reporting period");
  await page.getByRole("link", { name: "View report", exact: true }).click();
  await expect(page).toHaveURL(/#\/reports\/product-performance\?period=7d$/);
  await expect(
    page.getByLabel("Reporting period", { exact: true }),
  ).toHaveValue("7d");
});

test("saved insight, unique task, reminder, completion, undo, and supporting report retain context", async ({
  page,
}) => {
  await openRoute(page, "/insights");
  const title = "Revenue is growing with order volume";
  await expect(
    page.getByRole("heading", { name: title, exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Save insight", exact: true }).click();
  await page.getByRole("button", { name: "Add to to-do", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Task added", exact: true }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "Remind me", exact: true }).click();
  const reminder = page.getByRole("dialog", { name: "Local reminder" });
  await reminder.getByLabel("Reminder date").fill("2026-09-30");
  await reminder.getByRole("button", { name: "Save reminder" }).click();
  await page
    .getByRole("button", { name: "Ask a follow-up", exact: true })
    .click();
  const followup = page.getByRole("dialog", {
    name: "Sample follow-up explanations",
  });
  await followup.getByLabel("Example question").selectOption("1");
  await expect(
    followup.getByText(/The demo has no campaign attribution/),
  ).toBeVisible();
  await followup.getByRole("button", { name: "Close", exact: true }).click();
  const views = page.getByRole("navigation", { name: "Insight views" });
  await views.getByRole("link", { name: /^To do/ }).click();
  await expect(
    page.getByRole("heading", { name: title, exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Mark completed", exact: true })
    .click();
  await views.getByRole("link", { name: /^Completed/ }).click();
  await expect(
    page.getByRole("heading", { name: title, exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Completed", exact: true }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await views.getByRole("link", { name: /^Saved/ }).click();
  await expect(
    page.getByRole("heading", { name: title, exact: true }),
  ).toBeVisible();
  const state = await page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key)!),
    STORAGE_KEY,
  );
  expect(state.tasks).toHaveLength(1);
  expect(state.tasks[0]).toMatchObject({
    title,
    status: "todo",
    reminderDate: "2026-09-30",
  });
  expect(state.tasks[0].context).toContain("The sample reporting period");
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Saved insight", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page
    .getByRole("button", { name: "Supporting data", exact: true })
    .click();
  await page
    .getByRole("link", { name: "Open supporting report", exact: true })
    .click();
  await expect(page).toHaveURL(/#\/reports\/revenue-overview$/);
});
