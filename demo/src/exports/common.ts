import type { ReportData } from "../selectors";
import { METRIC_LABELS, METRIC_DEFINITIONS } from "../selectors";
export { METRIC_LABELS, METRIC_DEFINITIONS };

export type ExportFormat =
  "PDF" | "PowerPoint" | "Excel" | "CSV" | "AI Summary" | "JSON";
export interface ExportFile {
  bytes: Uint8Array<ArrayBuffer>;
  filename: string;
  mimeType: string;
}
export const EXPORT_DISCLOSURE =
  "Interactive demo. Sample data. No live integrations.";
export const EXPORT_SCOPE =
  "A browser-local snapshot of synthetic commerce records. Values do not represent business results.";
export const MONEY_METRICS = new Set([
  "netRevenue",
  "aov",
  "subscriptionRevenue",
]);
export const RATE_METRICS = new Set(["refundRate", "retention"]);
export const currency = (cents: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
    cents / 100,
  );
export const filenameFor = (data: ReportData, extension: string) => {
  const title =
    data.title
      .normalize("NFKD")
      .replace(/[^a-zA-Z0-9 -]/g, "")
      .trim()
      .replace(/\s+/g, "-")
      .slice(0, 70)
      .toLowerCase() || "report";
  return `loom-demo-${title}-${data.snapshot.slice(0, 10)}.${extension}`;
};
export const bytesOf = (text: string): Uint8Array<ArrayBuffer> =>
  new TextEncoder().encode(text);
export const changeLabel = (value: number | null, unit: "%" | "pp") =>
  value === null
    ? "No baseline"
    : `${value > 0 ? "+" : ""}${value.toFixed(1)}${unit === "pp" ? " pp" : "%"}`;

/** Exported snapshots keep the selector's numbers; exporters do not recalculate business metrics. */
export function reportSummary(data: ReportData) {
  return {
    schemaVersion: 1,
    kind: "loom-demo-report-summary",
    title: data.title,
    period: data.periodLabel,
    snapshot: data.snapshot,
    comparisonEnabled: data.comparisonEnabled,
    disclosure: EXPORT_DISCLOSURE,
    scope: EXPORT_SCOPE,
    generation: "Deterministic sample explanation. No live model.",
    units: {
      money: "USD cents",
      rates: "percent (0-100)",
      rateChanges: "percentage points",
    },
    facts: data.metrics.map(
      (metric) => `${metric.label}: ${metric.formatted}.`,
    ),
    metrics: data.metrics,
    definitions: Object.fromEntries(
      data.metrics.map((metric) => [metric.id, METRIC_DEFINITIONS[metric.id]]),
    ),
    periods: data.rows,
    products: data.products,
  };
}

/** RFC 4180 quoting plus spreadsheet-formula neutralization for user-controlled strings. */
export function csvCell(
  value: string | number | boolean | null | undefined,
): string {
  if (value === null || value === undefined) return "";
  let text = String(value);
  if (typeof value === "string" && /^[\s\u0000-\u001f]*[=+\-@]/.test(text))
    text = `'${text}`;
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function csvBytes(
  rows: readonly (readonly (string | number | boolean | null | undefined)[])[],
) {
  return bytesOf(
    "\uFEFF" +
      rows.map((row) => row.map(csvCell).join(",")).join("\r\n") +
      "\r\n",
  );
}

export function reportCsv(data: ReportData): Uint8Array<ArrayBuffer> {
  const metrics = data.metrics.map((metric) => metric.id);
  return csvBytes([
    ["Report", data.title],
    ["Period", data.periodLabel],
    ["Snapshot", data.snapshot],
    ["Disclosure", EXPORT_DISCLOSURE],
    [
      "Units",
      "USD cents for money; rates use percent (0-100); changes in rate use percentage points",
    ],
    [],
    ["Metric", "Raw value", "Display value", "Change", "Change unit"],
    ...data.metrics.map((metric) => [
      metric.label,
      metric.value,
      metric.formatted,
      data.comparisonEnabled ? (metric.change ?? "No baseline") : "Off",
      data.comparisonEnabled ? metric.changeUnit : "",
    ]),
    [],
    [
      "Period start",
      ...metrics.map(
        (id) =>
          `${METRIC_LABELS[id]}${MONEY_METRICS.has(id) ? " (USD cents)" : RATE_METRICS.has(id) ? " (%)" : ""}`,
      ),
    ],
    ...data.rows.map((row) => [row.date, ...metrics.map((id) => row[id])]),
    [],
    [
      "Product",
      "Orders",
      "Units",
      "Net revenue (USD cents)",
      "Revenue share (%)",
    ],
    ...data.products.map((product) => [
      product.name,
      product.orders,
      product.units,
      product.netRevenue,
      product.share,
    ]),
  ]);
}
