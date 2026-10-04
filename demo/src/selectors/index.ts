import type {
  DemoState,
  MetricId,
  Order,
  OrderFilters,
  Period,
  Product,
  PurchaseConfig,
  Report,
} from "../domain/model";
import { addDays, monthCells, SCHEDULE_ANCHOR } from "../domain/calendar";
export {
  nextAutomationRun,
  monthCells,
  addDays,
  addMonths,
  nextOccurrence,
} from "../domain/calendar";
export const DEFAULT_FILTERS: OrderFilters = {
  search: "",
  period: "30d",
  type: "all",
  payment: "all",
  fulfillment: "all",
  release: "all",
  sort: "date-desc",
};
export const METRIC_LABELS: Record<MetricId, string> = {
  netRevenue: "Net revenue",
  orders: "Orders",
  aov: "Average order value",
  subscriptionRevenue: "Subscription revenue",
  refundRate: "Refund rate",
  retention: "Contract retention",
};
export const METRIC_DEFINITIONS: Record<MetricId, string> = {
  netRevenue:
    "Paid and refunded line totals minus recorded refunds. Failed/pending payments, taxes, and shipping are excluded.",
  orders: "All placed sample orders in the period, including cancelled orders.",
  aov: "Net revenue divided by paid or refunded orders in the period; zero when there are none.",
  subscriptionRevenue: "Net revenue from subscription orders in the period.",
  refundRate:
    "Orders with a recorded refund divided by paid or refunded orders; expressed as a percentage.",
  retention:
    "Contracts started by period start and not previously cancelled form the cohort. Contracts not cancelled by period end are retained, including paused contracts.",
};
export const money = (cents: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
    cents / 100,
  );
export const percent = (value: number) => `${value.toFixed(1)}%`;
export function formatMetric(id: MetricId, value: number): string {
  return ["netRevenue", "aov", "subscriptionRevenue"].includes(id)
    ? money(value)
    : ["refundRate", "retention"].includes(id)
      ? percent(value)
      : value.toLocaleString("en-US");
}
export const orderTotal = (order: Order) =>
  order.lines.reduce(
    (total, line) => total + line.unitPriceCents * line.quantity,
    0,
  );
export const orderNet = (order: Order) =>
  ["Paid", "Refunded"].includes(order.payment)
    ? Math.max(0, orderTotal(order) - order.refundCents)
    : 0;
export function purchasePrice(
  product: Product | number,
  config: PurchaseConfig,
  mode: "one-time" | "subscription" | "prepaid" = "subscription",
): number {
  const base = typeof product === "number" ? product : product.priceCents;
  return mode === "one-time"
    ? base
    : Math.round(
        (base *
          (100 -
            (mode === "prepaid" ? config.prepaid.discount : config.discount))) /
          100,
      );
}
export function periodBounds(
  state: DemoState,
  period: Period,
  previous = false,
) {
  const days = Number.parseInt(period, 10);
  const end = addDays(state.snapshot.slice(0, 10), previous ? -days : 0);
  const start = addDays(end, 1 - days);
  return {
    start,
    end,
    days,
    label: `${new Date(`${start}T12:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" })} – ${new Date(`${end}T12:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" })}`,
  };
}
export function periodOrders(
  state: DemoState,
  period: Period,
  previous = false,
): Order[] {
  const { start, end } = periodBounds(state, period, previous);
  return state.orders.filter(
    (order) => order.date >= start && order.date <= end,
  );
}
export function selectOrders(
  state: DemoState,
  supplied: Partial<OrderFilters> = {},
): Order[] {
  const filters = { ...DEFAULT_FILTERS, ...supplied };
  const query = filters.search.toLowerCase().trim();
  const orders =
    filters.period === "all"
      ? state.orders.filter((o) => o.date <= state.snapshot.slice(0, 10))
      : periodOrders(state, filters.period);
  return orders
    .filter(
      (order) =>
        (!query ||
          [
            order.number,
            order.customer,
            ...order.lines.map(
              (line) =>
                state.products.find((p) => p.id === line.productId)?.name ?? "",
            ),
          ]
            .join(" ")
            .toLowerCase()
            .includes(query)) &&
        (filters.type === "all" || order.type === filters.type) &&
        (filters.payment === "all" || order.payment === filters.payment) &&
        (filters.fulfillment === "all" ||
          order.fulfillment === filters.fulfillment) &&
        (filters.release === "all" || order.release === filters.release),
    )
    .sort((a, b) =>
      filters.sort === "total-desc"
        ? orderTotal(b) - orderTotal(a)
        : filters.sort === "total-asc"
          ? orderTotal(a) - orderTotal(b)
          : filters.sort === "date-asc"
            ? a.date.localeCompare(b.date) || a.number.localeCompare(b.number)
            : b.date.localeCompare(a.date) || b.number.localeCompare(a.number),
    );
}
export function selectOrderMetrics(state: DemoState, period: Period = "30d") {
  const orders = periodOrders(state, period);
  return {
    total: orders.length,
    totalOrders: orders.length,
    subscription: orders.filter((o) => o.type === "Subscription").length,
    oneTime: orders.filter((o) => o.type === "One-time").length,
    needsReview: orders.filter((o) => o.release === "Needs review").length,
    ready: orders.filter((o) => o.release === "Ready").length,
    scheduled: orders.filter((o) => o.fulfillment === "Scheduled").length,
    completed: orders.filter((o) => o.fulfillment === "Fulfilled").length,
    failed: orders.filter((o) => o.payment === "Failed").length,
    netRevenue: orders.reduce((sum, order) => sum + orderNet(order), 0),
  };
}
export interface OrderContextGroup {
  count: number;
  revenue: number;
  aov: number;
  counts: number[];
  revenues: number[];
  aovs: number[];
}
export function selectOrderContext(
  state: DemoState,
  period: Period = "30d",
): {
  subscription: OrderContextGroup;
  oneTime: OrderContextGroup;
  review: number;
  pending: number;
  ready: number;
} {
  const orders = periodOrders(state, period);
  const { start, end } = periodBounds(state, period);
  function summarize(items: Order[]) {
    const revenue = items.reduce((sum, order) => sum + orderNet(order), 0);
    const paid = items.filter((order) =>
      ["Paid", "Refunded"].includes(order.payment),
    ).length;
    return {
      count: items.length,
      revenue,
      aov: paid ? Math.round(revenue / paid) : 0,
    };
  }
  function group(type: Order["type"]): OrderContextGroup {
    const items = orders.filter((order) => order.type === type);
    const points: ReturnType<typeof summarize>[] = [];
    for (let date = start; date <= end; date = addDays(date, 1))
      points.push(summarize(items.filter((order) => order.date === date)));
    return {
      ...summarize(items),
      counts: points.map((point) => point.count),
      revenues: points.map((point) => point.revenue),
      aovs: points.map((point) => point.aov),
    };
  }
  return {
    subscription: group("Subscription"),
    oneTime: group("One-time"),
    review: orders.filter((order) => order.release === "Needs review").length,
    pending: orders.filter((order) =>
      ["Pending", "Failed"].includes(order.payment),
    ).length,
    ready: orders.filter(
      (order) =>
        order.release === "Ready" &&
        order.payment === "Paid" &&
        order.fulfillment !== "Cancelled",
    ).length,
  };
}
export interface MetricValues {
  netRevenue: number;
  orders: number;
  aov: number;
  subscriptionRevenue: number;
  refundRate: number;
  retention: number;
}
export interface MetricValue {
  id: MetricId;
  label: string;
  value: number;
  formatted: string;
  change: number | null;
  changeUnit: "%" | "pp";
}
export interface ReportRow extends MetricValues {
  date: string;
}
export interface ProductPerformance {
  id: string;
  name: string;
  orders: number;
  units: number;
  netRevenue: number;
  share: number;
}
export interface ReportData {
  title: string;
  periodLabel: string;
  snapshot: string;
  comparisonEnabled: boolean;
  metrics: MetricValue[];
  rows: ReportRow[];
  products: ProductPerformance[];
}
export function calculateMetrics(
  state: DemoState,
  orders: Order[],
  start: string,
  end: string,
): MetricValues {
  const paid = orders.filter((o) => ["Paid", "Refunded"].includes(o.payment));
  const netRevenue = orders.reduce((sum, order) => sum + orderNet(order), 0);
  const cohort = state.subscriptions.filter(
    (s) =>
      s.startedDate <= start && (!s.cancelledDate || s.cancelledDate >= start),
  );
  const retained = cohort.filter(
    (s) => !s.cancelledDate || s.cancelledDate > end,
  );
  return {
    netRevenue,
    orders: orders.length,
    aov: paid.length ? Math.round(netRevenue / paid.length) : 0,
    subscriptionRevenue: orders
      .filter((o) => o.type === "Subscription")
      .reduce((sum, order) => sum + orderNet(order), 0),
    refundRate: paid.length
      ? (paid.filter((o) => o.refundCents > 0).length / paid.length) * 100
      : 0,
    retention: cohort.length ? (retained.length / cohort.length) * 100 : 0,
  };
}
export function metricChange(
  id: MetricId,
  current: number,
  previous: number,
): number | null {
  return ["refundRate", "retention"].includes(id)
    ? current - previous
    : previous === 0
      ? current === 0
        ? 0
        : null
      : ((current - previous) / Math.abs(previous)) * 100;
}
export function selectProductPerformance(
  state: DemoState,
  orders: Order[],
): ProductPerformance[] {
  const total = orders.reduce((sum, order) => sum + orderNet(order), 0);
  return state.products
    .map((product) => {
      const productOrders = orders.filter((o) =>
        o.lines.some((l) => l.productId === product.id),
      );
      let netRevenue = 0;
      let units = 0;
      for (const order of productOrders) {
        const lines = order.lines.filter((l) => l.productId === product.id);
        const gross = lines.reduce(
          (sum, l) => sum + l.quantity * l.unitPriceCents,
          0,
        );
        if (["Paid", "Refunded"].includes(order.payment)) {
          const share = orderTotal(order) ? gross / orderTotal(order) : 0;
          netRevenue += Math.max(
            0,
            gross - Math.round(order.refundCents * share),
          );
          units += lines.reduce((sum, l) => sum + l.quantity, 0);
        }
      }
      return {
        id: product.id,
        name: product.name,
        orders: productOrders.length,
        units,
        netRevenue,
        share: total ? (netRevenue / total) * 100 : 0,
      };
    })
    .sort(
      (a, b) => b.netRevenue - a.netRevenue || a.name.localeCompare(b.name),
    );
}
export function selectAnalytics(
  state: DemoState,
  period: Period = "30d",
  grouping: Report["grouping"] = "day",
) {
  const bounds = periodBounds(state, period);
  const priorBounds = periodBounds(state, period, true);
  const orders = periodOrders(state, period);
  const previousOrders = periodOrders(state, period, true);
  const current = calculateMetrics(state, orders, bounds.start, bounds.end);
  const previous = calculateMetrics(
    state,
    previousOrders,
    priorBounds.start,
    priorBounds.end,
  );
  const metrics: MetricValue[] = (Object.keys(METRIC_LABELS) as MetricId[]).map(
    (id) => ({
      id,
      label: METRIC_LABELS[id],
      value: current[id],
      formatted: formatMetric(id, current[id]),
      change: metricChange(id, current[id], previous[id]),
      changeUnit: ["refundRate", "retention"].includes(id) ? "pp" : "%",
    }),
  );
  const buckets = new Map<
    string,
    { start: string; end: string; orders: Order[] }
  >();
  for (
    let date = bounds.start, index = 0;
    date <= bounds.end;
    date = addDays(date, 1), index++
  ) {
    const key =
      grouping === "month"
        ? date.slice(0, 7)
        : grouping === "week"
          ? addDays(bounds.start, Math.floor(index / 7) * 7)
          : date;
    const entry = buckets.get(key) ?? { start: date, end: date, orders: [] };
    entry.end = date;
    entry.orders.push(...orders.filter((o) => o.date === date));
    buckets.set(key, entry);
  }
  const trend: ReportRow[] = [...buckets].map(([date, bucket]) => ({
    date,
    ...calculateMetrics(state, bucket.orders, bucket.start, bucket.end),
  }));
  return {
    current,
    previous,
    metrics,
    trend,
    products: selectProductPerformance(state, orders),
    periodLabel: bounds.label,
    bounds,
    previousBounds: priorBounds,
  };
}
export function selectReportData(state: DemoState, report: Report): ReportData {
  const analytics = selectAnalytics(state, report.period, report.grouping);
  return {
    title: report.name,
    periodLabel: analytics.periodLabel,
    snapshot: state.snapshot,
    comparisonEnabled: report.compare,
    metrics: report.metrics
      .map((id) => analytics.metrics.find((metric) => metric.id === id)!)
      .filter(Boolean),
    rows: analytics.trend,
    products: analytics.products,
  };
}
export interface ScheduleDay {
  date: string;
  count: number;
  capacity: number;
  blackout: boolean;
  status: "blackout" | "over-capacity" | "near-limit" | "available";
  orders: Order[];
}
export function selectScheduleDays(
  state: DemoState,
  month = "2026-12",
): ScheduleDay[] {
  return monthCells(month)
    .filter((date): date is string => date !== null)
    .map((date) => {
      const orders = state.orders.filter(
        (o) => o.fulfillment === "Scheduled" && o.fulfillmentDate === date,
      );
      const weekday = new Date(`${date}T12:00:00Z`).getUTCDay();
      const blackout =
        state.scheduleRules.blackoutDates.includes(date) ||
        (state.scheduleRules.weekendBlackout &&
          (weekday === 0 || weekday === 6));
      const count = orders.length;
      const capacity = state.scheduleRules.capacity;
      return {
        date,
        count,
        capacity,
        blackout,
        status: blackout
          ? "blackout"
          : count > capacity
            ? "over-capacity"
            : count >= Math.ceil(capacity * 0.8)
              ? "near-limit"
              : "available",
        orders,
      };
    });
}
export function selectScheduleExceptions(
  state: DemoState,
): (Order & { reason: string })[] {
  const scheduled = state.orders.filter(
    (o) =>
      o.fulfillment === "Scheduled" && o.fulfillmentDate >= SCHEDULE_ANCHOR,
  );
  const counts = new Map<string, number>();
  for (const order of scheduled)
    counts.set(
      order.fulfillmentDate,
      (counts.get(order.fulfillmentDate) ?? 0) + 1,
    );
  return scheduled.flatMap((order) => {
    const weekday = new Date(`${order.fulfillmentDate}T12:00:00Z`).getUTCDay();
    const overflowing =
      (counts.get(order.fulfillmentDate) ?? 0) > state.scheduleRules.capacity &&
      scheduled
        .filter((item) => item.fulfillmentDate === order.fulfillmentDate)
        .findIndex((item) => item.id === order.id) >=
        state.scheduleRules.capacity;
    const reason =
      state.scheduleRules.blackoutDates.includes(order.fulfillmentDate) ||
      (state.scheduleRules.weekendBlackout && (weekday === 0 || weekday === 6))
        ? "Blackout date"
        : order.fulfillmentDate <
            addDays(SCHEDULE_ANCHOR, state.scheduleRules.leadDays)
          ? "Lead time required"
          : overflowing
            ? "Over daily capacity"
            : "";
    return reason ? [{ ...order, reason }] : [];
  });
}
