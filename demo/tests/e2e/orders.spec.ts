import { readFile } from "node:fs/promises";
import { test, expect, openRoute } from "./helpers";

test("filtered review applies one valid release and returns to the preserved filter", async ({
  page,
  isMobile,
}) => {
  await openRoute(page);
  const attention = page.getByRole("button", {
    name: /\d+ orders need review/,
  });
  const original = Number((await attention.innerText()).match(/\d+/)![0]);
  expect(original).toBeGreaterThan(0);
  await attention.click();
  await expect(page).toHaveURL(/release=Needs\+review/);
  const row = page
    .getByRole(isMobile ? "article" : "row")
    .filter({ has: page.getByRole("link", { name: /^Review(?: order)?$/ }) })
    .first();
  const number = await row.getByRole("link", { name: /^#/ }).innerText();
  await row.getByRole("link", { name: /^Review(?: order)?$/ }).click();
  await expect(
    page.getByRole("heading", { name: `Order ${number}`, exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Review and release", exact: true })
    .click();
  const dialog = page.getByRole("dialog", { name: "Confirm sample release" });
  await expect(
    dialog.getByRole("button", { name: "Apply to demo" }),
  ).toBeDisabled();
  await dialog
    .getByRole("checkbox", {
      name: "I reviewed the sample fulfillment details.",
    })
    .check();
  await dialog.getByRole("button", { name: "Apply to demo" }).click();
  await expect(page.getByText("Released", { exact: true })).toBeVisible();
  await page.getByRole("link", { name: "Back to orders" }).click();
  await expect(page).toHaveURL(/release=Needs\+review/);
  await expect(
    page.getByRole("link", { name: number, exact: true }),
  ).toHaveCount(0);
  await expect(attention).toContainText(`${original - 1} orders need review`);
  await page.reload();
  await expect(attention).toContainText(`${original - 1} orders need review`);
});

test("saved order view restores filter and column choices; CSV contains only selected scope", async ({
  page,
}) => {
  await openRoute(page);
  await page
    .getByLabel("Order type", { exact: true })
    .selectOption("Subscription");
  await page.getByLabel("Search orders", { exact: true }).fill("Daily Greens");
  await page
    .getByRole("button", { name: "Customize view", exact: true })
    .click();
  const custom = page.getByRole("dialog", { name: "Customize order view" });
  await custom
    .getByRole("checkbox", { name: "Created", exact: true })
    .uncheck();
  await custom.getByRole("button", { name: "Move Payment left" }).click();
  await custom.getByRole("button", { name: "Done", exact: true }).click();
  await page.getByRole("button", { name: "Save view", exact: true }).click();
  const save = page.getByRole("dialog", { name: "Save order view" });
  await save.getByLabel("View name").fill("Greens subscription review");
  await save.getByRole("button", { name: "Save view", exact: true }).click();
  await page.getByRole("button", { name: "Clear filters" }).click();
  await page
    .getByLabel("Saved views")
    .selectOption({ label: "Greens subscription review" });
  await expect(page.getByLabel("Search orders", { exact: true })).toHaveValue(
    "Daily Greens",
  );
  await expect(page.getByLabel("Order type", { exact: true })).toHaveValue(
    "Subscription",
  );
  await expect(page.getByRole("columnheader", { name: "Created" })).toHaveCount(
    0,
  );
  const selection = page
    .getByRole("checkbox", { name: /^Select (?:sample )?order #/ })
    .first();
  const number = (await selection.getAttribute("aria-label"))!.replace(
    /^Select (?:sample )?order /,
    "",
  );
  await selection.check();
  await page.getByRole("button", { name: "Export", exact: true }).click();
  const downloadPromise = page.waitForEvent("download");
  await page
    .getByRole("dialog", { name: "Export sample orders" })
    .getByRole("button", { name: "Download CSV" })
    .click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe("loom-sample-orders.csv");
  const csv = await readFile((await download.path())!, "utf8");
  expect(csv.trim().split(/\r?\n/)).toHaveLength(2);
  expect(csv).toContain(number);
  expect(csv).toContain("Daily Greens Powder");
  expect(csv).toContain("Subscription");
  const fallback = page
    .getByRole("dialog", { name: "Export sample orders" })
    .getByRole("link", { name: "Save loom-sample-orders.csv", exact: true });
  await expect(fallback).toBeVisible();
  const manualDownloadPromise = page.waitForEvent("download");
  await fallback.click();
  const manualDownload = await manualDownloadPromise;
  expect(await readFile((await manualDownload.path())!, "utf8")).toBe(csv);
  await page
    .getByRole("dialog", { name: "Export sample orders" })
    .getByRole("button", { name: "Done", exact: true })
    .click();
  await page.reload();
  await page
    .getByLabel("Saved views")
    .selectOption({ label: "Greens subscription review" });
  await expect(page.getByRole("columnheader", { name: "Created" })).toHaveCount(
    0,
  );
});

test("order paging, sort, empty results, and blocked-order behavior", async ({
  page,
}) => {
  await openRoute(page);
  await page.getByLabel("Rows per page").selectOption("5");
  await expect(
    page.getByRole("checkbox", { name: /^Select (?:sample )?order #/ }),
  ).toHaveCount(5);
  const first = await page
    .getByRole("checkbox", { name: /^Select (?:sample )?order #/ })
    .first()
    .getAttribute("aria-label");
  await page.getByRole("button", { name: "Next orders page" }).click();
  await expect(
    page.getByRole("checkbox", { name: /^Select (?:sample )?order #/ }).first(),
  ).not.toHaveAttribute("aria-label", first!);
  await page.getByRole("button", { name: "Previous orders page" }).click();
  await page.getByRole("button", { name: "Additional order filters" }).click();
  await page
    .getByRole("dialog", { name: "Additional filters" })
    .getByLabel("Sort orders")
    .selectOption("date-asc");
  await page
    .getByRole("dialog", { name: "Additional filters" })
    .getByRole("button", { name: "Done" })
    .click();
  await expect(page).toHaveURL(/sort=date-asc/);
  await page.getByLabel("Search orders", { exact: true }).fill("not-an-order");
  await expect(
    page.getByRole("heading", { name: "No matching orders" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Clear filters" }).click();
  await page.getByLabel("Payment status").selectOption("Failed");
  await page
    .getByRole("link", { name: /^View(?: order)?$/ })
    .first()
    .click();
  await expect(
    page.getByText(
      "This order is blocked. Unpaid or cancelled records cannot be released.",
    ),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Review and release" }),
  ).toHaveCount(0);
});
