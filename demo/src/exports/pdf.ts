import type { ReportData } from "../selectors";
import {
  changeLabel,
  currency,
  EXPORT_DISCLOSURE,
  EXPORT_SCOPE,
} from "./common";

/** A real one-page PDF built from text and table primitives, never a renamed image. */
export async function createPdf(
  data: ReportData,
): Promise<Uint8Array<ArrayBuffer>> {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "pt", format: "a4", compress: false });
  const left = 42,
    right = 553,
    width = right - left;
  // Standard PDF fonts support Latin text. Replace unsupported controls/symbols deterministically.
  const clean = (text: string) =>
    text
      .replace(/[\u2010-\u2015]/g, "-")
      .replace(/\u2122/g, "(TM)")
      .replace(/[\u0000-\u001f\u007f]/g, " ")
      .replace(/[^\x20-\xFF]/g, "?");
  const write = (
    text: string,
    x: number,
    y: number,
    size = 10,
    bold = false,
  ) => {
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setFontSize(size);
    doc.text(clean(text), x, y);
  };
  doc.setProperties({
    title: clean(data.title),
    subject: EXPORT_SCOPE,
    author: "Loom public demo",
    creator: "Loom public demo",
  });
  doc.setCreationDate(new Date(data.snapshot));
  doc.setTextColor("#6454c0");
  write("LOOM / SAMPLE REPORT", left, 46, 10, true);
  doc.setTextColor("#24212b");
  const titleLines = doc
    .setFontSize(25)
    .splitTextToSize(clean(data.title), width)
    .slice(0, 2) as string[];
  doc.setFont("helvetica", "bold");
  doc.text(titleLines, left, 82);
  const titleEnd = 82 + (titleLines.length - 1) * 29;
  doc.setTextColor("#66616f");
  write(data.periodLabel, left, titleEnd + 28, 11);
  write(
    `Fixed demo snapshot: ${data.snapshot.slice(0, 10)}`,
    left,
    titleEnd + 45,
    9,
  );
  doc.setDrawColor("#dedbe7");
  doc.line(left, titleEnd + 59, right, titleEnd + 59);

  const headerY = titleEnd + 88;
  doc.setTextColor("#24212b");
  write("Report metrics", left, headerY, 14, true);
  doc.setFillColor("#f3f1f9");
  doc.rect(left, headerY + 13, width, 28, "F");
  write("Metric", left + 10, headerY + 31, 9, true);
  write("Value", left + 254, headerY + 31, 9, true);
  write("Comparison", left + 380, headerY + 31, 9, true);
  data.metrics.slice(0, 6).forEach((metric, index) => {
    const y = headerY + 62 + index * 31;
    write(metric.label, left + 10, y, 10);
    write(metric.formatted, left + 254, y, 11, true);
    write(
      data.comparisonEnabled
        ? changeLabel(metric.change, metric.changeUnit)
        : "Off",
      left + 380,
      y,
      10,
    );
    doc.setDrawColor("#eeecf2");
    doc.line(left, y + 11, right, y + 11);
  });
  const productY = headerY + 62 + Math.min(6, data.metrics.length) * 31 + 35;
  write("Product performance", left, productY, 14, true);
  doc.setTextColor("#66616f");
  write("Net revenue for the same report period", left, productY + 19, 9);
  doc.setTextColor("#24212b");
  data.products.slice(0, 5).forEach((product, index) => {
    const y = productY + 45 + index * 29;
    const name = doc.splitTextToSize(clean(product.name), 255)[0] as string;
    write(name, left, y, 10);
    write(`${product.orders} orders`, left + 274, y, 9);
    write(currency(product.netRevenue), left + 392, y, 10, true);
  });
  if (!data.products.length) {
    doc.setTextColor("#66616f");
    write("No products in this report scope.", left, productY + 45, 10);
  }
  doc.setTextColor("#66616f");
  doc.setFontSize(8.5);
  doc.setFont("helvetica", "normal");
  doc.text(doc.splitTextToSize(EXPORT_SCOPE, width), left, 751);
  write(
    "Money is USD. Rate comparisons are percentage points. Complete period data is in CSV / Excel.",
    left,
    783,
    8,
  );
  doc.setDrawColor("#dedbe7");
  doc.line(left, 798, right, 798);
  write(EXPORT_DISCLOSURE, left, 815, 8);
  return new Uint8Array(doc.output("arraybuffer"));
}
