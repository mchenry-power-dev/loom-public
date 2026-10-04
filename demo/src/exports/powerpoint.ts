import type { ReportData } from "../selectors";
import {
  changeLabel,
  currency,
  EXPORT_DISCLOSURE,
  EXPORT_SCOPE,
  METRIC_LABELS,
  METRIC_DEFINITIONS,
  MONEY_METRICS,
} from "./common";

export async function createPowerPoint(
  data: ReportData,
): Promise<Uint8Array<ArrayBuffer>> {
  const { default: PptxGenJS } = await import("pptxgenjs");
  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_WIDE";
  pptx.author = "Loom public demo";
  pptx.subject = EXPORT_SCOPE;
  pptx.title = data.title;
  pptx.company = "Loom public demo";
  pptx.theme = { headFontFace: "Arial", bodyFontFace: "Arial" };
  const makeSlide = (title: string, number: number) => {
    const slide = pptx.addSlide();
    slide.background = { color: "FAF9FC" };
    slide.addText("LOOM / SAMPLE REPORT", {
      x: 0.55,
      y: 0.25,
      w: 11.7,
      h: 0.25,
      fontSize: 11,
      bold: true,
      color: "6454C0",
      margin: 0,
    });
    slide.addText(title, {
      x: 0.55,
      y: 0.85,
      w: 12.1,
      h: 0.75,
      fontSize: 30,
      bold: true,
      color: "24212B",
      margin: 0,
      breakLine: false,
      fit: "shrink",
    });
    slide.addText(data.periodLabel, {
      x: 0.55,
      y: 1.63,
      w: 11.7,
      h: 0.32,
      fontSize: 15,
      color: "66616F",
      margin: 0,
    });
    slide.addText(EXPORT_DISCLOSURE, {
      x: 0.55,
      y: 7.03,
      w: 11.7,
      h: 0.2,
      fontSize: 10,
      color: "66616F",
      margin: 0,
    });
    slide.addText(String(number), {
      x: 12.15,
      y: 7.03,
      w: 0.4,
      h: 0.2,
      fontSize: 10,
      color: "66616F",
      align: "right",
      margin: 0,
    });
    slide.addNotes(
      `${EXPORT_SCOPE} Fixed demo snapshot: ${data.snapshot}. ${data.metrics.map((metric) => `${metric.label}: ${METRIC_DEFINITIONS[metric.id]}`).join(" ")}`,
    );
    return slide;
  };
  const tableOptions = {
    x: 0.55,
    y: 2.28,
    w: 12.1,
    border: { type: "solid" as const, color: "DEDCE5", pt: 0.5 },
    fontFace: "Arial",
    fontSize: 17,
    color: "24212B",
    margin: 0.14,
    rowH: 0.49,
    autoPage: false,
    fill: { color: "FFFFFF" },
    bold: false,
  };
  const header = (cells: string[]) =>
    cells.map((text) => ({
      text,
      options: { bold: true, fill: { color: "EFECF8" }, color: "433977" },
    }));
  const cells = (values: string[]) => values.map((text) => ({ text }));
  const summary = makeSlide(data.title, 1);
  summary.addTable(
    [
      header(["Metric", "Value", "Comparison"]),
      ...data.metrics.map((metric) =>
        cells([
          metric.label,
          metric.formatted,
          data.comparisonEnabled
            ? changeLabel(metric.change, metric.changeUnit)
            : "Off",
        ]),
      ),
    ],
    { ...tableOptions, colW: [5.8, 3.05, 3.25] },
  );
  summary.addText(
    "Rate differences use percentage points. All amounts are USD.",
    {
      x: 0.55,
      y: 6.3,
      w: 12.1,
      h: 0.38,
      fontSize: 14,
      color: "66616F",
      margin: 0,
    },
  );

  const metricId = data.metrics[0]?.id ?? "netRevenue";
  const isMoney = MONEY_METRICS.has(metricId);
  const trend = makeSlide(`${METRIC_LABELS[metricId]} by reporting period`, 2);
  trend.addText(
    isMoney ? "USD" : metricId === "orders" ? "Number of orders" : "Percent",
    {
      x: 0.55,
      y: 2.06,
      w: 5,
      h: 0.2,
      fontSize: 11,
      color: "66616F",
      margin: 0,
    },
  );
  if (data.rows.length) {
    trend.addChart(
      pptx.ChartType.line,
      [
        {
          name: METRIC_LABELS[metricId],
          labels: data.rows.map((row) => row.date),
          values: data.rows.map((row) =>
            isMoney ? row[metricId] / 100 : row[metricId],
          ),
        },
      ],
      {
        x: 0.55,
        y: 2.3,
        w: 12.1,
        h: 4.15,
        catAxisLabelFontFace: "Arial",
        catAxisLabelFontSize: 10,
        catAxisLabelRotate: 0,
        catAxisLabelFrequency: String(
          Math.max(1, Math.ceil(data.rows.length / 8)),
        ),
        valAxisLabelFontFace: "Arial",
        valAxisLabelFontSize: 12,
        valAxisTitle: isMoney
          ? "USD"
          : metricId === "orders"
            ? "Orders"
            : "Percent",
        showValue: false,
        showTitle: false,
        showLegend: false,
        chartColors: ["7460C5"],
        lineSize: 2,
        lineDataSymbol: data.rows.length <= 12 ? "circle" : "none",
        lineDataSymbolSize: 4,
        valGridLine: { color: "E4E1EB", size: 0.5 },
        catAxisLineColor: "D6D2E0",
        valAxisLineColor: "D6D2E0",
      },
    );
  } else {
    trend.addText("No records in this report period.", {
      x: 0.55,
      y: 2.6,
      w: 12,
      h: 1,
      fontSize: 22,
      color: "66616F",
    });
  }
  const products = makeSlide("Product performance", 3);
  products.addTable(
    [
      header(["Product", "Orders", "Units", "Net revenue"]),
      ...data.products
        .slice(0, 6)
        .map((product) =>
          cells([
            product.name,
            String(product.orders),
            String(product.units),
            currency(product.netRevenue),
          ]),
        ),
    ],
    { ...tableOptions, colW: [5.6, 1.7, 1.7, 3.1] },
  );
  products.addText(
    "Synthetic records describe the chosen period. They do not establish causes or business outcomes.",
    {
      x: 0.55,
      y: 6.2,
      w: 12.1,
      h: 0.5,
      fontSize: 15,
      color: "66616F",
      margin: 0,
    },
  );
  const buffer = await pptx.write({ outputType: "arraybuffer" });
  return new Uint8Array(buffer as ArrayBuffer);
}
