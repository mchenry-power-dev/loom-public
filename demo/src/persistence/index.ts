import type { DemoState } from "../domain/model";
import { createInitialState } from "../fixtures";
import { isISODate, SNAPSHOT } from "../domain/calendar";
import {
  validateAutomation,
  validatePurchase,
  validateReport,
  validateScheduleRules,
} from "../domain/validation";

export const STORAGE_KEY = "loom-public:interactive-demo:state:v1";
export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}
export interface LoadResult {
  state: DemoState;
  status: "loaded" | "fresh" | "session" | "invalid";
  message?: string;
}
export interface SaveResult {
  status: "saved" | "session" | "conflict" | "invalid";
  message: string;
  state?: DemoState;
}
const object = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === "object" && !Array.isArray(value);
const text = (value: unknown): value is string =>
  typeof value === "string" && value.length <= 20000;
const integer = (value: unknown): value is number =>
  Number.isSafeInteger(value) && (value as number) >= 0;
const collection = (value: unknown): value is Record<string, unknown>[] =>
  Array.isArray(value) && value.length <= 5000 && value.every(object);
const unique = (items: { id: string }[]) =>
  new Set(items.map((item) => item.id)).size === items.length;

/** Read validation treats browser storage as untrusted input; unknown schemas are rejected. */
export function validateStoredState(value: unknown): value is DemoState {
  try {
    if (
      !object(value) ||
      value.schemaVersion !== 1 ||
      !integer(value.revision) ||
      !text(value.writerId) ||
      value.snapshot !== SNAPSHOT ||
      !text(value.timezone)
    )
      return false;
    new Intl.DateTimeFormat("en-US", { timeZone: value.timezone }).format();
    for (const name of [
      "products",
      "orders",
      "subscriptions",
      "reports",
      "automations",
      "insights",
      "tasks",
      "savedViews",
      "activity",
      "cart",
    ])
      if (!collection(value[name])) return false;
    const state = value as unknown as DemoState;
    if (!state.products.length || !state.reports.length) return false;
    for (const items of [
      state.products,
      state.orders,
      state.subscriptions,
      state.reports,
      state.automations,
      state.insights,
      state.tasks,
      state.savedViews,
      state.activity,
      state.cart,
    ])
      if (items.some((item) => !text(item.id) || !item.id) || !unique(items))
        return false;
    const productIds = new Set(state.products.map((p) => p.id));
    const reportIds = new Set(state.reports.map((r) => r.id));
    const insightIds = new Set(state.insights.map((i) => i.id));
    if (
      state.products.some(
        (p) =>
          !text(p.name) ||
          !text(p.subtitle) ||
          !text(p.color) ||
          !text(p.category) ||
          !integer(p.priceCents),
      )
    )
      return false;
    if (!object(state.purchaseDrafts) || !object(state.purchaseApplied))
      return false;
    for (const id of productIds)
      for (const config of [
        state.purchaseDrafts[id],
        state.purchaseApplied[id],
      ]) {
        if (
          !config ||
          typeof config.oneTime !== "boolean" ||
          typeof config.subscription !== "boolean" ||
          !Array.isArray(config.frequencies) ||
          !config.frequencies.every((f) =>
            ["2 weeks", "4 weeks", "Monthly", "6 weeks", "8 weeks"].includes(f),
          ) ||
          !Array.isArray(config.benefits) ||
          !config.benefits.every(text) ||
          !object(config.prepaid) ||
          typeof config.prepaid.enabled !== "boolean" ||
          validatePurchase(config).length
        )
          return false;
      }
    if (
      state.orders.some(
        (o) =>
          !text(o.number) ||
          !text(o.customer) ||
          !["Subscription", "One-time"].includes(o.type) ||
          !["Paid", "Pending", "Failed", "Refunded"].includes(o.payment) ||
          !["Unfulfilled", "Scheduled", "Fulfilled", "Cancelled"].includes(
            o.fulfillment,
          ) ||
          ![
            "Needs review",
            "Ready",
            "Released",
            "Complete",
            "Blocked",
          ].includes(o.release) ||
          ![o.date, o.billingDate, o.fulfillmentDate, o.deliveryDate].every(
            isISODate,
          ) ||
          !integer(o.refundCents) ||
          !Array.isArray(o.lines) ||
          !o.lines.length ||
          o.lines.some(
            (l) =>
              !productIds.has(l.productId) ||
              !integer(l.quantity) ||
              l.quantity === 0 ||
              !integer(l.unitPriceCents),
          ),
      )
    )
      return false;
    if (
      state.subscriptions.some(
        (s) =>
          !productIds.has(s.productId) ||
          !text(s.customer) ||
          !["Active", "Paused", "Cancelled"].includes(s.status) ||
          !["2 weeks", "4 weeks", "Monthly", "6 weeks", "8 weeks"].includes(
            s.frequency,
          ) ||
          !isISODate(s.nextDate) ||
          !isISODate(s.startedDate),
      )
    )
      return false;
    if (
      state.orders.some(
        (order) =>
          order.subscriptionId &&
          !state.subscriptions.some(
            (subscription) =>
              subscription.id === order.subscriptionId &&
              subscription.customer === order.customer &&
              order.lines.every(
                (line) => line.productId === subscription.productId,
              ),
          ),
      )
    )
      return false;
    if (
      state.subscriptions.some(
        (subscription) =>
          subscription.cancelledDate !== undefined &&
          !isISODate(subscription.cancelledDate),
      )
    )
      return false;
    if (
      !object(state.scheduleRules) ||
      !Array.isArray(state.scheduleRules.blackoutDates) ||
      typeof state.scheduleRules.weekendBlackout !== "boolean" ||
      validateScheduleRules(state.scheduleRules).length
    )
      return false;
    if (
      state.scheduleProposal !== null &&
      (!object(state.scheduleProposal) ||
        !Array.isArray(state.scheduleProposal.orderIds) ||
        !state.scheduleProposal.orderIds.every(
          (id) => text(id) && state.orders.some((order) => order.id === id),
        ) ||
        !isISODate(state.scheduleProposal.date))
    )
      return false;
    if (
      state.reports.some(
        (r) =>
          !text(r.name) ||
          !text(r.template) ||
          !["7d", "30d", "90d"].includes(r.period) ||
          typeof r.compare !== "boolean" ||
          !["day", "week", "month"].includes(r.grouping) ||
          !["none", "product", "type"].includes(r.breakdown) ||
          !Array.isArray(r.metrics) ||
          !Array.isArray(r.visuals) ||
          r.visuals.some(
            (v) =>
              !text(v.id) ||
              !text(v.title) ||
              !["cards", "line", "bar", "table"].includes(v.type) ||
              !Array.isArray(v.metrics),
          ) ||
          validateReport(r).length,
      )
    )
      return false;
    if (
      state.reports.some(
        (report) =>
          !text(report.purpose) ||
          !text(report.updatedAt) ||
          Number.isNaN(Date.parse(report.updatedAt)),
      )
    )
      return false;
    if (
      state.automations.some(
        (a) =>
          !["Report", "Alert", "AI briefing"].includes(a.type) ||
          !["Active", "Paused"].includes(a.status) ||
          !["Daily", "Weekly", "Monthly", "On trigger"].includes(a.cadence) ||
          !Array.isArray(a.formats) ||
          a.formats.some(
            (f) => !["PDF", "PowerPoint", "Excel", "AI Summary"].includes(f),
          ) ||
          !Array.isArray(a.destinations) ||
          a.destinations.some(
            (d) => !["Email", "Teams", "Slack", "Text"].includes(d),
          ) ||
          !object(a.recipients) ||
          validateAutomation(state, a).length,
      )
    )
      return false;
    if (
      state.automations.some(
        (automation) =>
          ![
            automation.message,
            automation.summaryInstructions,
            automation.failureRecipient,
            automation.folder,
          ].every(text) ||
          typeof automation.summaryInBody !== "boolean" ||
          typeof automation.attachments !== "boolean" ||
          Object.entries(automation.recipients).some(
            ([destination, recipient]) =>
              !["Email", "Teams", "Slack", "Text"].includes(destination) ||
              !text(recipient),
          ),
      )
    )
      return false;
    if (
      state.insights.some(
        (i) =>
          !text(i.title) ||
          !text(i.summary) ||
          !Array.isArray(i.facts) ||
          !i.facts.every(text) ||
          !Array.isArray(i.questions) ||
          i.questions.some((q) => !text(q.question) || !text(q.answer)) ||
          !reportIds.has(i.reportId) ||
          typeof i.saved !== "boolean",
      )
    )
      return false;
    if (
      state.insights.some(
        (insight) =>
          ![insight.category, insight.change, insight.recommendation].every(
            text,
          ) || !["positive", "warning", "neutral"].includes(insight.tone),
      )
    )
      return false;
    if (
      state.tasks.some(
        (t) =>
          !insightIds.has(t.insightId) ||
          !text(t.title) ||
          !text(t.context) ||
          !["todo", "completed"].includes(t.status) ||
          (t.reminderDate !== null && !isISODate(t.reminderDate)),
      )
    )
      return false;
    if (
      state.tasks.some((task) =>
        task.status === "todo"
          ? task.completedAt !== null
          : !text(task.completedAt) ||
            Number.isNaN(Date.parse(task.completedAt)),
      )
    )
      return false;
    if (
      new Set(state.tasks.map((t) => t.insightId)).size !== state.tasks.length
    )
      return false;
    if (
      state.savedViews.some(
        (v) =>
          !text(v.name) ||
          !object(v.filters) ||
          !text(v.filters.search) ||
          !Array.isArray(v.columns) ||
          !v.columns.every(text),
      )
    )
      return false;
    if (
      state.savedViews.some(
        (view) =>
          !["7d", "30d", "90d", "all"].includes(view.filters.period) ||
          !["all", "Subscription", "One-time"].includes(view.filters.type) ||
          !["all", "Paid", "Pending", "Failed", "Refunded"].includes(
            view.filters.payment,
          ) ||
          ![
            "all",
            "Unfulfilled",
            "Scheduled",
            "Fulfilled",
            "Cancelled",
          ].includes(view.filters.fulfillment) ||
          ![
            "all",
            "Needs review",
            "Ready",
            "Released",
            "Complete",
            "Blocked",
          ].includes(view.filters.release) ||
          !["date-desc", "date-asc", "total-desc", "total-asc"].includes(
            view.filters.sort,
          ),
      )
    )
      return false;
    if (state.activity.some((a) => !text(a.date) || !text(a.message)))
      return false;
    if (
      state.cart.some(
        (c) =>
          !productIds.has(c.productId) ||
          !integer(c.unitPriceCents) ||
          !integer(c.quantity) ||
          c.quantity === 0 ||
          c.quantity > 20 ||
          !["one-time", "subscription", "prepaid"].includes(c.type) ||
          (c.frequency !== undefined &&
            !["2 weeks", "4 weeks", "Monthly", "6 weeks", "8 weeks"].includes(
              c.frequency,
            )),
      )
    )
      return false;
    if (
      !object(state.preferences) ||
      typeof state.preferences.compactRows !== "boolean" ||
      typeof state.preferences.reducedMotion !== "boolean"
    )
      return false;
    return true;
  } catch {
    return false;
  }
}
export function deserializeState(raw: string): DemoState | null {
  if (raw.length > 5_000_000) return null;
  try {
    const value: unknown = JSON.parse(raw);
    return validateStoredState(value) ? value : null;
  } catch {
    return null;
  }
}

export function createDemoStorage(
  provided?: StorageLike | null,
  writerId = `tab-${Math.random().toString(36).slice(2)}`,
) {
  let storage = provided;
  let baseline: string | null = null;
  let memory: DemoState | null = null;
  let unavailable = false;
  if (provided === undefined) {
    try {
      storage = globalThis.localStorage;
    } catch {
      storage = null;
    }
  }
  if (!storage) unavailable = true;
  const sessionMessage =
    "Session only: browser storage is unavailable or full. Changes will be lost when this tab closes.";
  return {
    key: STORAGE_KEY,
    writerId,
    load(): LoadResult {
      if (unavailable || !storage)
        return {
          state: memory ?? createInitialState(),
          status: "session",
          message: sessionMessage,
        };
      try {
        baseline = storage.getItem(STORAGE_KEY);
        if (baseline === null)
          return { state: createInitialState(), status: "fresh" };
        const state = deserializeState(baseline);
        if (!state)
          return {
            state: createInitialState(),
            status: "invalid",
            message:
              "Saved demo data was invalid or from an unsupported version. A fresh sample was loaded; other site data is untouched.",
          };
        memory = state;
        return { state, status: "loaded" };
      } catch {
        unavailable = true;
        return {
          state: memory ?? createInitialState(),
          status: "session",
          message: sessionMessage,
        };
      }
    },
    save(state: DemoState): SaveResult {
      if (!validateStoredState(state))
        return {
          status: "invalid",
          message: "The demo state could not be validated and was not saved.",
        };
      const saved = { ...state, writerId };
      memory = saved;
      if (unavailable || !storage)
        return { status: "session", message: sessionMessage };
      try {
        const current = storage.getItem(STORAGE_KEY);
        if (current !== baseline)
          return {
            status: "conflict",
            message:
              "Another tab changed this demo. Reload the newer saved version before continuing; this tab has not overwritten it.",
            state: current
              ? (deserializeState(current) ?? undefined)
              : createInitialState(),
          };
        const raw = JSON.stringify(saved);
        storage.setItem(STORAGE_KEY, raw);
        baseline = raw;
        return { status: "saved", message: "Saved in this browser." };
      } catch {
        unavailable = true;
        return { status: "session", message: sessionMessage };
      }
    },
    /** Use only after the caller confirms reset. Never clears the shared origin. */
    clear(): SaveResult {
      memory = null;
      if (unavailable || !storage)
        return { status: "session", message: sessionMessage };
      try {
        if (storage.getItem(STORAGE_KEY) !== baseline)
          return {
            status: "conflict",
            message: "Another tab changed the demo. Reload before resetting.",
          };
        storage.removeItem(STORAGE_KEY);
        baseline = null;
        return { status: "saved", message: "Only Loom demo data was reset." };
      } catch {
        unavailable = true;
        return { status: "session", message: sessionMessage };
      }
    },
  };
}
