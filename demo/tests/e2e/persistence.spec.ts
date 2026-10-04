import { test, expect, openRoute } from "./helpers";
import { STORAGE_KEY } from "../../src/persistence";
import type { Page } from "@playwright/test";

async function saveView(page: Page, name: string) {
  await page.getByRole("button", { name: "Save view", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Save order view" });
  await dialog.getByLabel("View name").fill(name);
  await dialog.getByRole("button", { name: "Save view", exact: true }).click();
}

test("unavailable storage remains usable and accurately reports session-only saving", async ({
  page,
}) => {
  await page.addInitScript((key) => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function (name, value) {
      if (name === key)
        throw new DOMException("Synthetic quota failure", "QuotaExceededError");
      return original.call(this, name, value);
    };
  }, STORAGE_KEY);
  await openRoute(page);
  await saveView(page, "Session-only view");
  await expect(
    page.getByText(/Session only: browser storage is unavailable or full/),
  ).toBeVisible();
  await expect(page.getByLabel("Saved views")).toBeVisible();
  await expect(
    page.getByText("Named view saved in this browser.", { exact: true }),
  ).toHaveCount(0);
  await page.reload();
  await expect(page.getByLabel("Saved views")).toHaveCount(0);
});

test("unsupported persisted schema falls back without touching another project", async ({
  page,
}) => {
  await page.addInitScript((key) => {
    localStorage.setItem(
      key,
      JSON.stringify({ schemaVersion: 987, orders: "invalid" }),
    );
    localStorage.setItem("another-project:example", "keep-this-value");
  }, STORAGE_KEY);
  await openRoute(page);
  await expect(
    page.getByText(
      /Saved demo data was invalid or from an unsupported version/,
    ),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "All store orders", exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(() => localStorage.getItem("another-project:example")),
  ).toBe("keep-this-value");
});

test("a stale second tab cannot overwrite a newer saved view", async ({
  page,
  context,
}) => {
  await openRoute(page);
  const second = await context.newPage();
  await openRoute(second);
  await saveView(page, "First tab view");
  await expect(second.getByText(/Another tab changed this demo/)).toBeVisible();
  await saveView(second, "Stale second tab view");
  const persisted = await page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key)!),
    STORAGE_KEY,
  );
  expect(
    persisted.savedViews.map((view: { name: string }) => view.name),
  ).toEqual(["First tab view"]);
  await second.close();
});

test("confirmed reset removes only this demo edits and cancel preserves them", async ({
  page,
}) => {
  await openRoute(page);
  await page.evaluate(() =>
    localStorage.setItem("another-project:example", "keep-this-value"),
  );
  await saveView(page, "Keep until confirmed reset");
  await openRoute(page, "/settings");
  await page
    .getByRole("button", { name: "Reset demo data", exact: true })
    .click();
  const dialog = page.getByRole("dialog", { name: "Reset this Loom demo?" });
  await expect(
    dialog.getByRole("button", { name: "Confirm reset", exact: true }),
  ).toBeDisabled();
  await dialog.getByRole("button", { name: "Cancel", exact: true }).click();
  let persisted = await page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key)!),
    STORAGE_KEY,
  );
  expect(
    persisted.savedViews.map((view: { name: string }) => view.name),
  ).toEqual(["Keep until confirmed reset"]);
  await page
    .getByRole("button", { name: "Reset demo data", exact: true })
    .click();
  await dialog
    .getByRole("checkbox", {
      name: "I understand my demo edits will be removed.",
    })
    .check();
  await dialog
    .getByRole("button", { name: "Confirm reset", exact: true })
    .click();
  persisted = await page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key)!),
    STORAGE_KEY,
  );
  expect(persisted.savedViews).toEqual([]);
  expect(
    await page.evaluate(() => localStorage.getItem("another-project:example")),
  ).toBe("keep-this-value");
  await page.reload();
  expect(
    await page.evaluate(() => localStorage.getItem("another-project:example")),
  ).toBe("keep-this-value");
});
