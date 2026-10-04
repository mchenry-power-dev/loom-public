import {
  test,
  expect,
  openRoute,
  mainNavigation,
  noHorizontalPageOverflow,
} from "./helpers";
import { readFile } from "node:fs/promises";
import JSZip from "jszip";

test("fresh visit has useful sample orders and every main destination works", async ({
  page,
}) => {
  await openRoute(page);
  await expect(
    page.getByRole("heading", { name: "Orders & Activity", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "All store orders", exact: true }),
  ).toBeVisible();
  for (const [destination, title] of [
    ["Home", "Welcome to Loom"],
    ["Products", "Products"],
    ["Analytics", "Analytics & Reporting"],
    ["Integrations", "Integrations"],
    ["Settings", "Settings"],
    ["Orders & Activity", "Orders & Activity"],
  ]) {
    await mainNavigation(page, destination);
    await expect(
      page.getByRole("heading", { level: 1, name: title, exact: true }),
    ).toBeVisible();
    await noHorizontalPageOverflow(page);
  }
});

test("local search, direct refresh, history, and empty result preserve usable navigation", async ({
  page,
}) => {
  await openRoute(page);
  await page
    .getByRole("button", { name: "Search orders, products, and reports" })
    .click();
  const dialog = page.getByRole("dialog", { name: "Search this demo" });
  await dialog.getByRole("textbox", { name: "Search query" }).fill("Greens");
  await dialog.getByRole("link", { name: /Daily Greens Powder/ }).click();
  await expect(page).toHaveURL(/#\/products\/daily-greens$/);
  await expect(
    page.getByRole("heading", { name: "Purchase Options", exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Purchase Options", exact: true }),
  ).toBeVisible();
  await page.goBack();
  await expect(
    page.getByRole("heading", { name: "Orders & Activity", exact: true }),
  ).toBeVisible();
  await page.goForward();
  await expect(
    page.getByRole("heading", { name: "Purchase Options", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Search orders, products, and reports" })
    .click();
  await dialog
    .getByRole("textbox", { name: "Search query" })
    .fill("no-synthetic-match-92837");
  await expect(dialog.getByText(/No sample records match/)).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
});

test("dialog traps keyboard focus and Escape returns focus to trigger", async ({
  page,
}) => {
  await openRoute(page);
  const navigation = page.getByRole("button", {
    name: "Open navigation",
    exact: true,
  });
  if (await navigation.isVisible()) {
    await navigation.click();
    const drawer = page.getByRole("dialog", { name: "Main navigation" });
    await expect(
      drawer.getByRole("link", { name: "Settings", exact: true }),
    ).toBeInViewport();
    await expect
      .poll(() =>
        drawer.evaluate((element) => element.contains(document.activeElement)),
      )
      .toBe(true);
    for (let index = 0; index < 10; index++) {
      await page.keyboard.press("Tab");
      await expect
        .poll(() =>
          drawer.evaluate((element) =>
            element.contains(document.activeElement),
          ),
        )
        .toBe(true);
    }
    await page.keyboard.press("Escape");
    await expect(navigation).toBeFocused();
  }
  const trigger = page.getByRole("button", {
    name: "Help and sample guidance",
  });
  await trigger.focus();
  await page.keyboard.press("Enter");
  const dialog = page.getByRole("dialog", { name: "Explore Loom" });
  await expect(dialog).toBeVisible();
  for (let i = 0; i < 10; i++) {
    await page.keyboard.press("Tab");
    await expect
      .poll(() =>
        dialog.evaluate((element) => element.contains(document.activeElement)),
      )
      .toBe(true);
  }
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(trigger).toBeFocused();
});

test("report form saves immediately and exports genuine PDF, PowerPoint, Excel, and CSV", async ({
  page,
}) => {
  test.setTimeout(60_000);
  await openRoute(page, "/reports");
  await page.getByLabel("Time grouping", { exact: true }).selectOption("day");
  await page.getByRole("button", { name: "Save as copy", exact: true }).click();
  const save = page.getByRole("dialog", { name: "Save report copy" });
  await save
    .getByLabel("Report name", { exact: true })
    .fill("Browser acceptance report");
  await save.getByLabel("Report name", { exact: true }).press("Enter");
  await expect(save).toHaveCount(0);
  await expect(page.getByLabel("Saved report", { exact: true })).toContainText(
    "Browser acceptance report",
  );
  await page.reload();
  await expect(page.getByLabel("Time grouping", { exact: true })).toHaveValue(
    "day",
  );
  await page.getByRole("button", { name: "Export", exact: true }).click();
  const dialog = page.getByRole("dialog", {
    name: "Export report",
    exact: true,
  });
  for (const [format, extension] of [
    ["PDF", ".pdf"],
    ["PowerPoint", ".pptx"],
    ["Excel", ".xlsx"],
    ["CSV", ".csv"],
  ]) {
    const pending = page.waitForEvent("download");
    await dialog.getByRole("button", { name: format, exact: true }).click();
    const download = await pending;
    expect(download.suggestedFilename()).toMatch(new RegExp(`\\${extension}$`));
    const bytes = await readFile((await download.path())!);
    expect(bytes.length).toBeGreaterThan(100);
    if (format === "PDF") {
      expect(bytes.subarray(0, 5).toString()).toBe("%PDF-");
      expect(bytes.toString("latin1")).toContain("/Type /Page");
    } else if (format === "PowerPoint" || format === "Excel") {
      const archive = await JSZip.loadAsync(bytes);
      expect(archive.file("[Content_Types].xml")).not.toBeNull();
      expect(
        archive.file(
          format === "PowerPoint" ? "ppt/presentation.xml" : "xl/workbook.xml",
        ),
      ).not.toBeNull();
      const textFiles = Object.keys(archive.files).filter((name) =>
        format === "PowerPoint"
          ? /^ppt\/slides\/slide\d+\.xml$/.test(name)
          : name === "xl/sharedStrings.xml" ||
            /^xl\/worksheets\/sheet\d+\.xml$/.test(name),
      );
      const content = (
        await Promise.all(
          textFiles.map((name) => archive.file(name)!.async("string")),
        )
      ).join(" ");
      expect(content).toContain("Browser acceptance report");
    } else {
      expect(bytes.toString("utf8")).toContain("Net revenue");
      expect(
        bytes.toString("utf8").trim().split(/\r?\n/).length,
      ).toBeGreaterThan(2);
    }
  }
});
