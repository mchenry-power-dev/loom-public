import { test, expect, openRoute } from "./helpers";
import { STORAGE_KEY } from "../../src/persistence";

test("report deletion explicitly reassigns linked automations and insights", async ({
  page,
}) => {
  await openRoute(page, "/reports/revenue-overview");
  await page
    .getByRole("button", { name: "Delete report", exact: true })
    .click();
  const dialog = page.getByRole("dialog", { name: "Delete this report?" });
  await expect(
    dialog.getByRole("button", { name: "Delete report", exact: true }),
  ).toBeDisabled();
  await dialog
    .getByLabel("Replacement report")
    .selectOption("subscription-health");
  await dialog.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(page.getByLabel("Saved report", { exact: true })).toHaveValue(
    "revenue-overview",
  );
  await page
    .getByRole("button", { name: "Delete report", exact: true })
    .click();
  await dialog
    .getByLabel("Replacement report")
    .selectOption("subscription-health");
  await dialog
    .getByRole("button", { name: "Delete report", exact: true })
    .click();
  await expect(page.getByLabel("Saved report", { exact: true })).toHaveValue(
    "subscription-health",
  );
  const saved = await page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key)!),
    STORAGE_KEY,
  );
  expect(
    saved.reports.some(
      (report: { id: string }) => report.id === "revenue-overview",
    ),
  ).toBe(false);
  expect(
    saved.automations.find(
      (automation: { id: string }) => automation.id === "auto-weekly",
    ).reportId,
  ).toBe("subscription-health");
  expect(
    saved.insights.some(
      (insight: { reportId: string }) =>
        insight.reportId === "revenue-overview",
    ),
  ).toBe(false);
});

test("report visuals edit, cancel, save, reopen, and reset independently", async ({
  page,
}) => {
  await openRoute(page, "/reports");
  await page.getByRole("button", { name: "Add visual", exact: true }).click();
  let visual = page.getByRole("dialog", { name: "Add report visual" });
  await visual.getByLabel("Visual title").fill("Order volume table");
  await visual.getByLabel("Visual type").selectOption("table");
  await visual.getByLabel("Visual metric").selectOption("orders");
  await visual.getByRole("button", { name: "Apply visual" }).click();
  await expect(
    page.getByRole("heading", { name: "Order volume table", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", {
      name: "Edit visual: Order volume table",
      exact: true,
    })
    .click();
  visual = page.getByRole("dialog", { name: "Edit report visual" });
  await visual.getByLabel("Visual title").fill("Cancelled visual edit");
  await visual.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Order volume table", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Save as copy", exact: true }).click();
  const save = page.getByRole("dialog", { name: "Save report copy" });
  await save.getByLabel("Report name").fill("Operations review");
  await save.getByRole("button", { name: "Save changes" }).click();
  const id = await page
    .getByLabel("Saved report", { exact: true })
    .inputValue();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Order volume table", exact: true }),
  ).toBeVisible();
  await page
    .getByLabel("Saved report", { exact: true })
    .selectOption("subscription-health");
  await page.getByLabel("Saved report", { exact: true }).selectOption(id);
  await expect(
    page.getByRole("heading", { name: "Order volume table", exact: true }),
  ).toBeVisible();
  await page.getByLabel("Time grouping").selectOption("month");
  await page.getByRole("button", { name: "Reset", exact: true }).click();
  await page
    .getByRole("dialog", { name: "Reset report edits?" })
    .getByRole("button", { name: "Reset edits" })
    .click();
  await expect(page.getByLabel("Time grouping")).toHaveValue("week");
});

test("saved report links to a multi-output automation with local preview, test, pause, resume, and duplicate lifecycle", async ({
  page,
  isMobile,
}) => {
  test.setTimeout(60_000);
  await openRoute(page, "/reports");
  await page.getByRole("button", { name: "Save as copy", exact: true }).click();
  const copy = page.getByRole("dialog", { name: "Save report copy" });
  await copy.getByLabel("Report name").fill("Automation source report");
  await copy.getByRole("button", { name: "Save changes" }).click();
  await expect(copy).toHaveCount(0);
  const reportId = await page
    .getByLabel("Saved report", { exact: true })
    .inputValue();
  await page
    .getByRole("navigation", { name: "Section navigation" })
    .getByRole("link", { name: "Automations", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Create automation", exact: true }),
  ).toHaveCount(0);
  await page
    .getByRole("button", { name: "Create automation", exact: true })
    .click();
  await page
    .getByLabel("Automation name", { exact: true })
    .fill("Acceptance weekly report");
  await page
    .getByLabel("Report / data source", { exact: true })
    .selectOption(reportId);
  await page.getByLabel("Folder", { exact: true }).fill("Acceptance reporting");
  await page.getByLabel("PowerPoint output", { exact: true }).check();
  await page.getByLabel("Excel output", { exact: true }).check();
  await page.getByLabel("AI Summary output", { exact: true }).check();
  await page.getByLabel("Slack destination", { exact: true }).check();
  await page
    .getByLabel("Slack recipients", { exact: true })
    .fill("#sample-acceptance");
  await page
    .getByLabel("Email recipients", { exact: true })
    .fill("reviewer@demo.example");
  await page.getByRole("button", { name: "View preview", exact: true }).click();
  const preview = page.getByRole("dialog", {
    name: "Automation output preview",
  });
  await expect(
    preview.getByText("Automation source report", { exact: true }),
  ).toBeVisible();
  await expect(preview.getByText("PowerPoint", { exact: true })).toBeVisible();
  await expect(
    preview.getByText("Slack: #sample-acceptance", { exact: true }),
  ).toBeVisible();
  await preview.getByRole("button", { name: "Close dialog" }).click();
  await page
    .getByRole("button", { name: "Save automation", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Edit automation", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Send test", exact: true }).click();
  const result = page.getByRole("dialog", { name: "Local test result" });
  await expect(
    result.getByText("Local test prepared. No message was sent.", {
      exact: true,
    }),
  ).toBeVisible();
  await result
    .getByRole("button", { name: "Download selected outputs" })
    .click();
  const output = page.getByRole("dialog", {
    name: "Download selected outputs",
    exact: true,
  });
  const pending = page.waitForEvent("download");
  await output.getByRole("button", { name: "Excel", exact: true }).click();
  expect((await pending).suggestedFilename()).toMatch(/\.xlsx$/);
  await output.getByRole("button", { name: "Close dialog" }).click();
  await result.getByRole("button", { name: "Close dialog" }).click();
  await page.getByRole("button", { name: "Close automation editor" }).click();
  await page.getByLabel("Search automations").fill("Acceptance weekly report");
  const row = page
    .getByRole(isMobile ? "article" : "row")
    .filter({ hasText: "Acceptance weekly report" })
    .first();
  await page
    .getByRole("button", {
      name: "Actions for Acceptance weekly report",
      exact: true,
    })
    .click();
  await page.getByRole("menuitem", { name: "Pause", exact: true }).click();
  await expect(row).toContainText("Paused");
  await expect(row).not.toContainText("Sep 28");
  await page
    .getByRole("button", {
      name: "Actions for Acceptance weekly report",
      exact: true,
    })
    .click();
  await page.getByRole("menuitem", { name: "Resume", exact: true }).click();
  await expect(row).toContainText("Sep 28");
  await page
    .getByRole("button", {
      name: "Actions for Acceptance weekly report",
      exact: true,
    })
    .click();
  await page.getByRole("menuitem", { name: "Duplicate", exact: true }).click();
  await page
    .getByRole("button", {
      name: "Actions for Acceptance weekly report (copy)",
      exact: true,
    })
    .click();
  await page.getByRole("menuitem", { name: "Delete", exact: true }).click();
  await page
    .getByRole("dialog", { name: "Delete this automation?" })
    .getByRole("button", { name: "Delete automation", exact: true })
    .click();
  await expect(
    page.getByRole("button", {
      name: "Actions for Acceptance weekly report (copy)",
      exact: true,
    }),
  ).toHaveCount(0);
  const persisted = await page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key)!),
    STORAGE_KEY,
  );
  const automation = persisted.automations.find(
    (item: { name: string }) => item.name === "Acceptance weekly report",
  );
  expect(automation.reportId).toBe(reportId);
  expect(automation.formats).toEqual([
    "PDF",
    "PowerPoint",
    "Excel",
    "AI Summary",
  ]);
  expect(automation.destinations).toEqual(["Email", "Slack"]);
  expect(
    persisted.activity.filter((item: { message: string }) =>
      item.message.startsWith("Local test prepared"),
    ),
  ).toHaveLength(1);
});
