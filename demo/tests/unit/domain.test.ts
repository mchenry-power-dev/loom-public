import { describe, expect, it } from "vitest";
import { createInitialState, demoReducer } from "../../src/domain/reducer";
import {
  actionErrors,
  validateAutomation,
  validatePurchase,
  validateScheduleProposal,
} from "../../src/domain/validation";
import {
  addDays,
  addMonths,
  monthCells,
  nextAutomationRun,
  nextOccurrence,
  zonedDateTime,
} from "../../src/domain/calendar";
import {
  DEFAULT_FILTERS,
  metricChange,
  orderNet,
  orderTotal,
  periodOrders,
  purchasePrice,
  selectAnalytics,
  selectOrderContext,
  selectOrders,
  selectReportData,
  selectScheduleDays,
  selectScheduleExceptions,
} from "../../src/selectors";
import {
  createDemoStorage,
  deserializeState,
  STORAGE_KEY,
  validateStoredState,
} from "../../src/persistence";
import type { StorageLike } from "../../src/persistence";

describe("fixed, shared synthetic data and calculation definitions", () => {
  it("has complete current and comparison periods without including the future schedule", () => {
    const state = createInitialState();
    expect(periodOrders(state, "30d")).toHaveLength(234);
    expect(periodOrders(state, "30d", true)).toHaveLength(180);
    expect(periodOrders(state, "90d")).toHaveLength(534);
    expect(periodOrders(state, "90d", true)).toHaveLength(270);
    expect(selectOrders(state).every((o) => o.date <= "2026-09-27")).toBe(true);
    expect(state.orders.some((o) => o.date === "2026-12-01")).toBe(true);
  });
  it("uses integer cents and independently sums revenue in selectors and reports", () => {
    const state = createInitialState();
    const orders = periodOrders(state, "30d");
    const analytics = selectAnalytics(state);
    const data = selectReportData(state, state.reports[0]);
    expect(analytics.current.netRevenue).toBe(
      orders.reduce((sum, o) => sum + orderNet(o), 0),
    );
    expect(data.rows.reduce((sum, row) => sum + row.netRevenue, 0)).toBe(
      analytics.current.netRevenue,
    );
    expect(data.products.reduce((sum, p) => sum + p.netRevenue, 0)).toBe(
      analytics.current.netRevenue,
    );
    expect(data.metrics.find((m) => m.id === "netRevenue")?.value).toBe(
      analytics.current.netRevenue,
    );
    expect(analytics.current.aov).toBe(
      Math.round(
        analytics.current.netRevenue /
          orders.filter((o) => ["Paid", "Refunded"].includes(o.payment)).length,
      ),
    );
  });
  it("defines refund and retention denominators and reports rate differences in percentage points", () => {
    const state = createInitialState();
    const analytics = selectAnalytics(state);
    expect(analytics.current.retention).toBeCloseTo((43 / 48) * 100);
    expect(analytics.previous.retention).toBe(100);
    expect(
      analytics.metrics.find((m) => m.id === "retention")?.changeUnit,
    ).toBe("pp");
    expect(metricChange("refundRate", 6.2, 4.8)).toBeCloseTo(1.4);
    expect(metricChange("netRevenue", 50, 0)).toBeNull();
    expect(metricChange("orders", 0, 0)).toBe(0);
  });
  it("does not count failed payments as revenue or permit negative net amounts", () => {
    const order = createInitialState().orders[1];
    expect(orderNet({ ...order, payment: "Failed" })).toBe(0);
    expect(orderNet({ ...order, refundCents: orderTotal(order) + 100 })).toBe(
      0,
    );
  });
  it("reconciles order-context summaries and daily series with the shared analytics totals", () => {
    const state = createInitialState();
    for (const period of ["7d", "30d", "90d"] as const) {
      const context = selectOrderContext(state, period);
      const analytics = selectAnalytics(state, period);
      expect(context.subscription.count + context.oneTime.count).toBe(
        analytics.current.orders,
      );
      expect(context.subscription.revenue + context.oneTime.revenue).toBe(
        analytics.current.netRevenue,
      );
      for (const group of [context.subscription, context.oneTime]) {
        expect(group.counts).toHaveLength(Number.parseInt(period));
        expect(group.counts.reduce((sum, value) => sum + value, 0)).toBe(
          group.count,
        );
        expect(group.revenues.reduce((sum, value) => sum + value, 0)).toBe(
          group.revenue,
        );
        expect(group.aovs.every(Number.isInteger)).toBe(true);
      }
      expect(context.review).toBe(
        selectOrders(state, { period, release: "Needs review" }).length,
      );
    }
  });
  it("restores meaningful search, filters, sort and columns through cloned named views", () => {
    const state = createInitialState();
    const filters = {
      ...DEFAULT_FILTERS,
      search: "Daily Greens",
      type: "Subscription" as const,
      sort: "total-desc" as const,
    };
    const view = {
      id: "my-view",
      name: "Greens subscriptions",
      filters,
      columns: ["number", "type", "total"],
    };
    const saved = demoReducer(state, { type: "view/save", view });
    view.columns.push("payment");
    expect(saved.savedViews[0].columns).toHaveLength(3);
    const result = selectOrders(saved, saved.savedViews[0].filters);
    expect(result.length).toBeGreaterThan(0);
    expect(
      result.every(
        (o) =>
          o.type === "Subscription" &&
          o.lines.some((l) => l.productId === "daily-greens"),
      ),
    ).toBe(true);
    expect(result.map(orderTotal)).toEqual(
      result.map(orderTotal).sort((a, b) => b - a),
    );
  });
  it("creates isolated fixture instances", () => {
    const first = createInitialState();
    first.purchaseDrafts["daily-greens"].benefits.push("Changed");
    expect(
      createInitialState().purchaseDrafts["daily-greens"].benefits,
    ).not.toContain("Changed");
  });
  it("links order identity and products to matching contracts, with one future occurrence per scenario contract", () => {
    const state = createInitialState();
    for (const order of state.orders.filter((item) => item.subscriptionId)) {
      const subscription = state.subscriptions.find(
        (item) => item.id === order.subscriptionId,
      )!;
      expect(subscription.customer).toBe(order.customer);
      expect(subscription.productId).toBe(order.lines[0].productId);
      expect(subscription.startedDate <= order.date).toBe(true);
      if (order.id.startsWith("schedule-"))
        expect(subscription.nextDate).toBe(order.fulfillmentDate);
    }
    expect(
      state.subscriptions.filter(
        (s) => s.startedDate > state.snapshot.slice(0, 10),
      ),
    ).toHaveLength(126);
  });
});

describe("purchase options and consequential local operations", () => {
  it("prices $34 at 10% off as $30.60 and rejects an invalid configuration", () => {
    const state = createInitialState();
    const config = state.purchaseDrafts["daily-greens"];
    expect(purchasePrice(state.products[0], config)).toBe(3060);
    expect(
      validatePurchase({ ...config, oneTime: false, subscription: false }),
    ).toContain("Enable at least one purchase option.");
    expect(
      validatePurchase({
        ...config,
        frequencies: ["Monthly"],
        defaultFrequency: "4 weeks",
      }),
    ).not.toHaveLength(0);
  });
  it("keeps product drafts separate from applied settings and other products", () => {
    const state = createInitialState();
    const config = { ...state.purchaseDrafts["daily-greens"], discount: 20 };
    const draft = demoReducer(state, {
      type: "purchase/draft",
      productId: "daily-greens",
      config,
    });
    expect(draft.purchaseDrafts["daily-greens"].discount).toBe(20);
    expect(draft.purchaseApplied["daily-greens"].discount).toBe(10);
    expect(draft.purchaseDrafts["plant-protein"].discount).toBe(10);
    const applied = demoReducer(draft, {
      type: "purchase/apply",
      productId: "daily-greens",
    });
    expect(applied.purchaseApplied["daily-greens"].discount).toBe(20);
    expect(
      demoReducer(applied, {
        type: "purchase/apply",
        productId: "daily-greens",
      }),
    ).toBe(applied);
  });
  it("rejects unpaid releases and applies eligible actions once", () => {
    const state = createInitialState();
    const blocked = state.orders.find((o) => o.payment === "Failed")!;
    expect(demoReducer(state, { type: "order/release", id: blocked.id })).toBe(
      state,
    );
    const review = state.orders.find(
      (o) => o.release === "Needs review" && o.date < "2026-12-01",
    )!;
    const released = demoReducer(state, {
      type: "order/release",
      id: review.id,
    });
    expect(released.orders.find((o) => o.id === review.id)?.release).toBe(
      "Released",
    );
    expect(released.activity).toHaveLength(1);
    expect(
      demoReducer(released, { type: "order/release", id: review.id }),
    ).toBe(released);
    const complete = demoReducer(released, {
      type: "order/complete",
      id: review.id,
    });
    expect(complete.orders.find((o) => o.id === review.id)?.fulfillment).toBe(
      "Fulfilled",
    );
  });
  it("pauses/resumes only eligible contracts and only categorizes cancelled contracts", () => {
    const state = createInitialState();
    const active = state.subscriptions[0];
    const cancelled = state.subscriptions.find(
      (s) => s.status === "Cancelled",
    )!;
    const paused = demoReducer(state, {
      type: "subscription/status",
      id: active.id,
      status: "Paused",
    });
    expect(paused.subscriptions[0].status).toBe("Paused");
    expect(
      demoReducer(paused, { type: "subscription/skip", id: active.id }),
    ).toBe(paused);
    expect(
      demoReducer(state, {
        type: "subscription/status",
        id: cancelled.id,
        status: "Active",
      }),
    ).toBe(state);
    expect(
      demoReducer(state, {
        type: "subscription/reason",
        id: active.id,
        reason: "Price",
      }),
    ).toBe(state);
    const categorized = demoReducer(state, {
      type: "subscription/reason",
      id: cancelled.id,
      reason: "Price",
    });
    expect(
      categorized.subscriptions.find((s) => s.id === cancelled.id)
        ?.cancellationReason,
    ).toBe("Price");
  });
});

describe("calendar and current-state scheduling validation", () => {
  it("aligns month boundaries and keeps calendar dates stable across daylight saving", () => {
    expect(monthCells("2026-12").slice(0, 4)).toEqual([
      null,
      null,
      "2026-12-01",
      "2026-12-02",
    ]);
    expect(monthCells("2028-02")).toContain("2028-02-29");
    expect(addDays("2026-03-07", 2)).toBe("2026-03-09");
    expect(addDays("2026-10-31", 2)).toBe("2026-11-02");
    expect(addMonths("2026-01-31", 1)).toBe("2026-02-28");
    expect(nextOccurrence("2026-01-01", "Monthly")).toBe("2026-02-01");
    expect(nextOccurrence("2026-01-01", "4 weeks")).toBe("2026-01-29");
  });
  it("preview then cancel leaves all baseline orders and activity untouched", () => {
    const state = createInitialState();
    const order = selectScheduleExceptions(state)[0];
    const preview = demoReducer(state, {
      type: "schedule/preview",
      proposal: { orderIds: [order.id], date: "2026-12-29" },
    });
    expect(preview.orders).toBe(state.orders);
    expect(preview.activity).toBe(state.activity);
    const cancelled = demoReducer(preview, { type: "schedule/cancel" });
    expect(cancelled.orders).toBe(state.orders);
    expect(cancelled.scheduleProposal).toBeNull();
  });
  it("blocks blackout, over-capacity and lead-time dates", () => {
    const state = createInitialState();
    const id = selectScheduleExceptions(state)[0].id;
    for (const date of ["2026-12-25", "2026-12-10", "2026-12-01", "2026-02-30"])
      expect(
        validateScheduleProposal(state, { orderIds: [id], date }).length,
      ).toBeGreaterThan(0);
    expect(
      validateScheduleProposal(state, { orderIds: [id], date: "2026-12-29" }),
    ).toEqual([]);
  });
  it("validates again on apply and updates schedule, exceptions and activity atomically", () => {
    const state = createInitialState();
    const order = selectScheduleExceptions(state)[0];
    const preview = demoReducer(state, {
      type: "schedule/preview",
      proposal: { orderIds: [order.id, order.id], date: "2026-12-29" },
    });
    const changedRules = demoReducer(preview, {
      type: "schedule/rules",
      rules: {
        ...state.scheduleRules,
        blackoutDates: [...state.scheduleRules.blackoutDates, "2026-12-29"],
      },
    });
    expect(demoReducer(changedRules, { type: "schedule/apply" })).toBe(
      changedRules,
    );
    const applied = demoReducer(preview, { type: "schedule/apply" });
    const moved = applied.orders.find((o) => o.id === order.id)!;
    expect(moved.fulfillmentDate).toBe("2026-12-29");
    expect(moved.deliveryDate).toBe("2027-01-01");
    expect(moved.billingDate).toBe(order.billingDate);
    expect(
      applied.subscriptions.find((s) => s.id === moved.subscriptionId)
        ?.nextDate,
    ).toBe("2026-12-29");
    expect(
      selectScheduleExceptions(applied).some((o) => o.id === order.id),
    ).toBe(false);
    expect(
      selectScheduleDays(applied).find((d) => d.date === "2026-12-29")?.count,
    ).toBe(1);
    expect(applied.activity).toHaveLength(1);
    expect(demoReducer(applied, { type: "schedule/apply" })).toBe(applied);
  });
  it("skipping a future contract moves its linked occurrence by cadence and rejects conflicting destinations", () => {
    const state = createInitialState();
    const subscription = state.subscriptions.find(
      (s) => s.id === "sub-schedule-10-10",
    )!;
    const skipped = demoReducer(state, {
      type: "subscription/skip",
      id: subscription.id,
    });
    expect(
      skipped.subscriptions.find((s) => s.id === subscription.id)?.nextDate,
    ).toBe("2027-01-10");
    const order = skipped.orders.find(
      (o) => o.subscriptionId === subscription.id,
    )!;
    expect(order.fulfillmentDate).toBe("2027-01-10");
    expect(order.billingDate).toBe("2027-01-08");
    expect(order.release).toBe("Ready");
    expect(order.attention).toBeUndefined();
    const blocked = {
      ...state,
      scheduleRules: { ...state.scheduleRules, blackoutDates: ["2027-01-10"] },
    };
    expect(
      demoReducer(blocked, { type: "subscription/skip", id: subscription.id }),
    ).toBe(blocked);
    expect(
      actionErrors(blocked, { type: "subscription/skip", id: subscription.id }),
    ).toContain("This date is a blackout day.");
  });
});

describe("reports, automation schedules, and insight task identity", () => {
  it("preserves referenced reports unless every link can be reassigned", () => {
    const state = createInitialState();
    expect(
      actionErrors(state, { type: "report/delete", id: "revenue-overview" }),
    ).not.toHaveLength(0);
    expect(
      demoReducer(state, { type: "report/delete", id: "revenue-overview" }),
    ).toBe(state);
    const deleted = demoReducer(state, {
      type: "report/delete",
      id: "revenue-overview",
      replacementId: "product-performance",
    });
    expect(deleted.reports.some((r) => r.id === "revenue-overview")).toBe(
      false,
    );
    expect(
      deleted.automations.some((a) => a.reportId === "revenue-overview"),
    ).toBe(false);
    expect(
      deleted.insights.some((i) => i.reportId === "revenue-overview"),
    ).toBe(false);
    expect(validateStoredState(deleted)).toBe(true);
  });
  it("rejects missing reports or invalid channel destinations", () => {
    const state = createInitialState();
    const automation = state.automations[0];
    expect(validateAutomation(state, automation)).toEqual([]);
    expect(
      validateAutomation(state, { ...automation, reportId: "missing" }),
    ).not.toHaveLength(0);
    expect(
      validateAutomation(state, {
        ...automation,
        recipients: { Email: "real@example.com" },
      }),
    ).toContain("Use .example email addresses, separated by commas.");
    expect(
      validateAutomation(state, {
        ...automation,
        destinations: ["Slack"],
        recipients: { Slack: "bad channel" },
      }),
    ).not.toHaveLength(0);
  });
  it("computes next runs in the configured time zone and has no date for paused/trigger entries", () => {
    const state = createInitialState();
    const automation = state.automations[0];
    expect(nextAutomationRun(automation)).toBe("2026-09-28T13:00:00.000Z");
    expect(nextAutomationRun({ ...automation, status: "Paused" })).toBeNull();
    expect(
      nextAutomationRun({ ...automation, cadence: "On trigger" }),
    ).toBeNull();
    expect(
      nextAutomationRun(
        { ...automation, cadence: "Monthly", day: 31 },
        "2026-02-01T00:00:00Z",
      ),
    ).toBe("2026-02-28T14:00:00.000Z");
    expect(zonedDateTime("2026-03-07", "09:00", "America/New_York")).toBe(
      "2026-03-07T14:00:00.000Z",
    );
    expect(zonedDateTime("2026-03-08", "09:00", "America/New_York")).toBe(
      "2026-03-08T13:00:00.000Z",
    );
    expect(zonedDateTime("2026-11-01", "09:00", "America/New_York")).toBe(
      "2026-11-01T14:00:00.000Z",
    );
    expect(zonedDateTime("2026-03-08", "02:30", "America/New_York")).toBe(
      "2026-03-08T07:30:00.000Z",
    );
  });
  it("duplicates automations as paused independent configurations", () => {
    const state = createInitialState();
    const duplicated = demoReducer(state, {
      type: "automation/duplicate",
      id: state.automations[0].id,
      newId: "copy-1",
    });
    expect(duplicated.automations.at(-1)?.status).toBe("Paused");
    expect(duplicated.automations.at(-1)?.formats).not.toBe(
      state.automations[0].formats,
    );
    expect(
      demoReducer(duplicated, {
        type: "automation/duplicate",
        id: state.automations[0].id,
        newId: "copy-1",
      }),
    ).toBe(duplicated);
  });
  it("keeps bookmark, one task, reminder and completion independent with reversible completion", () => {
    const state = createInitialState();
    const insightId = state.insights[0].id;
    const saved = demoReducer(state, {
      type: "insight/save",
      id: insightId,
      saved: true,
    });
    const task = demoReducer(saved, { type: "task/add", insightId });
    expect(demoReducer(task, { type: "task/add", insightId })).toBe(task);
    const reminder = demoReducer(task, {
      type: "task/reminder",
      insightId,
      date: "2026-10-01",
    });
    const completed = demoReducer(reminder, {
      type: "task/status",
      insightId,
      status: "completed",
    });
    expect(completed.tasks[0].reminderDate).toBe("2026-10-01");
    expect(completed.insights[0].saved).toBe(true);
    expect(completed.tasks[0].context).toContain(state.insights[0].summary);
    expect(completed.orders).toBe(state.orders);
    const undone = demoReducer(completed, {
      type: "task/status",
      insightId,
      status: "todo",
    });
    expect(undone.tasks).toHaveLength(1);
    expect(undone.tasks[0].status).toBe("todo");
    expect(undone.tasks[0].completedAt).toBeNull();
  });
});

class MemoryStorage implements StorageLike {
  values = new Map<string, string>();
  getItem(key: string) {
    return this.values.get(key) ?? null;
  }
  setItem(key: string, value: string) {
    this.values.set(key, value);
  }
  removeItem(key: string) {
    this.values.delete(key);
  }
}
describe("validated, scoped persistence and conflict-safe reset", () => {
  it("round trips a valid state and rejects malformed, unknown-version, or broken-link state", () => {
    const state = createInitialState();
    expect(validateStoredState(state)).toBe(true);
    expect(deserializeState(JSON.stringify(state))).toEqual(state);
    expect(deserializeState("{broken")).toBeNull();
    expect(
      deserializeState(JSON.stringify({ ...state, schemaVersion: 999 })),
    ).toBeNull();
    expect(
      deserializeState(
        JSON.stringify({
          ...state,
          orders: [
            {
              ...state.orders[0],
              lines: [{ productId: "private", quantity: 1, unitPriceCents: 5 }],
            },
          ],
        }),
      ),
    ).toBeNull();
    expect(
      deserializeState(
        JSON.stringify({
          ...state,
          automations: [{ ...state.automations[0], reportId: "missing" }],
        }),
      ),
    ).toBeNull();
  });
  it("saves and resets only this demo namespace", () => {
    const storage = new MemoryStorage();
    storage.setItem("another-project:state", "keep me");
    const adapter = createDemoStorage(storage, "tab-a");
    expect(adapter.load().status).toBe("fresh");
    expect(adapter.save(createInitialState()).status).toBe("saved");
    expect(storage.getItem(STORAGE_KEY)).not.toBeNull();
    expect(adapter.load().state.writerId).toBe("tab-a");
    expect(adapter.clear().status).toBe("saved");
    expect(storage.getItem(STORAGE_KEY)).toBeNull();
    expect(storage.getItem("another-project:state")).toBe("keep me");
  });
  it("rejects broken report metrics, view enums, task history, and missing rendering fields", () => {
    const corrupt = (
      mutate: (state: ReturnType<typeof createInitialState>) => void,
    ) => {
      const state = createInitialState();
      mutate(state);
      expect(deserializeState(JSON.stringify(state))).toBeNull();
    };
    corrupt((state) => {
      state.reports[0].metrics = ["arbitrary-formula" as never];
    });
    corrupt((state) => {
      state.reports[0].visuals[0].metrics = ["retention"];
    });
    corrupt((state) => {
      state.savedViews = [
        {
          id: "bad-view",
          name: "Bad",
          columns: [],
          filters: { ...DEFAULT_FILTERS, period: "yesterday" as never },
        },
      ];
    });
    corrupt((state) => {
      state.insights[0].recommendation = undefined as never;
    });
    corrupt((state) => {
      state.automations[0].summaryInstructions = undefined as never;
    });
    corrupt((state) => {
      state.automations[0].threshold = Number.NaN;
    });
    corrupt((state) => {
      state.tasks = [
        {
          id: "broken-task",
          insightId: state.insights[0].id,
          title: "Task",
          context: "Original context",
          status: "completed",
          reminderDate: null,
          completedAt: null,
        },
      ];
    });
  });
  it("retains changes in memory and explicitly reports quota/storage failure", () => {
    const blocked: StorageLike = {
      getItem: () => null,
      setItem: () => {
        throw new Error("QuotaExceededError");
      },
      removeItem: () => undefined,
    };
    const adapter = createDemoStorage(blocked);
    adapter.load();
    const state = demoReducer(createInitialState(), {
      type: "insight/save",
      id: "insight-revenue",
      saved: true,
    });
    const saved = adapter.save(state);
    expect(saved.status).toBe("session");
    expect(saved.message).toContain("Session only");
    expect(adapter.load().state.insights[0].saved).toBe(true);
    expect(createDemoStorage(null).load().status).toBe("session");
  });
  it("does not overwrite newer edits or resets from another tab", () => {
    const storage = new MemoryStorage();
    const first = createDemoStorage(storage, "a");
    const second = createDemoStorage(storage, "b");
    const initial = first.load().state;
    second.load();
    expect(
      first.save(
        demoReducer(initial, {
          type: "insight/save",
          id: "insight-revenue",
          saved: true,
        }),
      ).status,
    ).toBe("saved");
    expect(second.save(initial).status).toBe("conflict");
    expect(second.clear().status).toBe("conflict");
    expect(
      deserializeState(storage.getItem(STORAGE_KEY)!)?.insights[0].saved,
    ).toBe(true);
    expect(second.load().state.insights[0].saved).toBe(true);
    expect(second.clear().status).toBe("saved");
    expect(first.save(initial).status).toBe("conflict");
  });
  it("handles corrupt saved data without clearing unrelated values", () => {
    const storage = new MemoryStorage();
    storage.setItem(STORAGE_KEY, "{broken");
    storage.setItem("other", "safe");
    const result = createDemoStorage(storage).load();
    expect(result.status).toBe("invalid");
    expect(result.state.schemaVersion).toBe(1);
    expect(storage.getItem("other")).toBe("safe");
  });
});
