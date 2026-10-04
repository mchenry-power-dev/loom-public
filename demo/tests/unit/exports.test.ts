import { afterEach, describe, expect, it, vi } from "vitest";
import JSZip from "jszip";
import ExcelJS from "exceljs";
import type { ReportData } from "../../src/selectors";
import {
  createReportExport,
  csvBytes,
  csvCell,
  reportSummary,
  requestFileDownload,
  requestReportDownload,
} from "../../src/exports";

const report: ReportData = {
  title: "Subscription performance",
  periodLabel: "April 1-30, 2026",
  snapshot: "2026-04-30T12:00:00.000Z",
  comparisonEnabled: true,
  metrics: [
    {
      id: "netRevenue",
      label: "Net revenue",
      value: 18360,
      formatted: "$183.60",
      change: 12.4,
      changeUnit: "%",
    },
    {
      id: "orders",
      label: "Paid orders",
      value: 6,
      formatted: "6",
      change: 20,
      changeUnit: "%",
    },
    {
      id: "aov",
      label: "Average order value",
      value: 3060,
      formatted: "$30.60",
      change: 1.8,
      changeUnit: "%",
    },
    {
      id: "refundRate",
      label: "Refund rate",
      value: 6.2,
      formatted: "6.2%",
      change: 1.4,
      changeUnit: "pp",
    },
  ],
  rows: [
    {
      date: "2026-04-01",
      netRevenue: 6120,
      orders: 2,
      aov: 3060,
      subscriptionRevenue: 6120,
      refundRate: 0,
      retention: 95,
    },
    {
      date: "2026-04-02",
      netRevenue: 12240,
      orders: 4,
      aov: 3060,
      subscriptionRevenue: 9180,
      refundRate: 6.2,
      retention: 95,
    },
  ],
  products: [
    {
      id: "greens",
      name: "Daily Greens Powder",
      orders: 6,
      units: 6,
      netRevenue: 18360,
      share: 100,
    },
  ],
};

afterEach(() => vi.unstubAllGlobals());

describe("local report exports", () => {
  it("preserves the exact selector data and labels deterministic sample explanations", async () => {
    const file = await createReportExport(report, "AI Summary");
    const parsed = JSON.parse(new TextDecoder().decode(file.bytes));
    expect(file.filename).toBe(
      "loom-demo-subscription-performance-2026-04-30.json",
    );
    expect(parsed.metrics).toEqual(report.metrics);
    expect(parsed.periods).toEqual(report.rows);
    expect(parsed.products).toEqual(report.products);
    expect(parsed.generation).toContain("No live model");
    expect(parsed.facts).toContain("Average order value: $30.60.");
    expect(reportSummary(report).units.money).toBe("USD cents");
  });

  it("writes scoped CSV with explicit units, exact cents, RFC 4180 escaping and formula neutralization", async () => {
    const file = await createReportExport(report, "CSV");
    const csv = new TextDecoder().decode(file.bytes);
    expect(csv).toContain("Net revenue,18360,$183.60,12.4,%");
    expect(csv).toContain("2026-04-01,6120,2,3060,0");
    expect(csv).toContain("Daily Greens Powder,6,6,18360,100");
    expect(csv).toContain("Net revenue (USD cents)");
    expect(csvCell('line one\n"quoted",two')).toBe(
      '"line one\n""quoted"",two"',
    );
    expect(csvCell(" =SUM(A1:A2)")).toBe("' =SUM(A1:A2)");
    expect(csvCell("@SUM(A1)")).toBe("'@SUM(A1)");
    expect(csvCell(-42)).toBe("-42");
    expect(
      new TextDecoder().decode(
        csvBytes([
          ["first", "second"],
          ["a,b", "c"],
        ]),
      ),
    ).toBe('first,second\r\n"a,b",c\r\n');
  });

  it("creates a single-page PDF containing report values and disclosure", async () => {
    const file = await createReportExport(report, "PDF");
    const pdf = new TextDecoder("latin1").decode(file.bytes);
    expect(file.mimeType).toBe("application/pdf");
    expect(pdf.startsWith("%PDF-")).toBe(true);
    expect(pdf).toContain("/Type /Page\n");
    expect(pdf).toContain("/Count 1");
    expect(pdf).toContain("(Subscription performance)");
    expect(pdf).toContain("($183.60)");
    expect(pdf).toContain("(+1.4 pp)");
    expect(pdf).toContain(
      "(Interactive demo. Sample data. No live integrations.)",
    );
    expect(pdf.trimEnd().endsWith("%%EOF")).toBe(true);
  });

  it("creates three real PPTX slides with editable tables, chart and embedded source workbook", async () => {
    const file = await createReportExport(report, "PowerPoint");
    const zip = await JSZip.loadAsync(file.bytes);
    expect(zip.file("[Content_Types].xml")).not.toBeNull();
    expect(
      Object.keys(zip.files).filter((name) =>
        /^ppt\/slides\/slide\d+\.xml$/.test(name),
      ),
    ).toHaveLength(3);
    const slide = await zip.file("ppt/slides/slide1.xml")!.async("string");
    expect(slide).toContain("Subscription performance");
    expect(slide).toContain("$183.60");
    expect(slide).toContain("1.4 pp");
    expect(slide).toContain("<a:tbl>");
    expect(slide).toContain("Sample data");
    const chart = await zip.file("ppt/charts/chart1.xml")!.async("string");
    expect(chart).toContain("2026-04-01");
    expect(chart).toContain("61.2");
    expect(chart).toContain("<c:lineChart>");
    expect(
      Object.keys(zip.files).some((name) =>
        /^ppt\/embeddings\/.*\.xlsx$/.test(name),
      ),
    ).toBe(true);
  });

  it("round-trips a genuine XLSX with typed amounts, dates and rates", async () => {
    const file = await createReportExport(report, "Excel");
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(file.bytes.buffer);
    expect(workbook.worksheets.map((sheet) => sheet.name)).toEqual([
      "Report",
      "Periods",
      "Products",
    ]);
    const summary = workbook.getWorksheet("Report")!;
    expect(summary.getCell("A2").value).toBe(report.title);
    expect(summary.getCell("B8").value).toBe(183.6);
    expect(summary.getCell("B8").numFmt).toBe('"$"#,##0.00');
    expect(summary.getCell("B11").value).toBe(0.062);
    expect(summary.getCell("C11").value).toBe(1.4);
    expect(summary.getCell("C11").numFmt).toBe('0.0" pp"');
    const periods = workbook.getWorksheet("Periods")!;
    expect(periods.getCell("A2").value).toEqual(
      new Date("2026-04-01T00:00:00.000Z"),
    );
    expect(periods.getCell("B2").value).toBe(61.2);
    expect(periods.rowCount).toBe(3);
    expect(periods.views[0]).toMatchObject({ state: "frozen", ySplit: 1 });
    expect(workbook.getWorksheet("Products")!.getCell("E2").value).toBe(1);
    expect(workbook.getWorksheet("Products")!.getCell("D4").value).toEqual({
      formula: "SUM(D2:D2)",
      result: 183.6,
    });
    expect(workbook.getWorksheet("Products")!.getCell("C4").value).toEqual({
      formula: "SUM(C2:C2)",
      result: 6,
    });
    expect(workbook.getWorksheet("Products")!.autoFilter).toBe("A1:E2");
    expect(summary.getCell("A7").fill).toMatchObject({
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF54448A" },
    });
  });

  it("packages all XLSX relationships and keeps XML/formula-like user text as literal strings", async () => {
    const literal = '=HYPERLINK("https://invalid.example", "A&B <tag>")';
    const file = await createReportExport(
      {
        ...report,
        title: literal,
        products: [{ ...report.products[0], name: literal }],
      },
      "Excel",
    );
    const zip = await JSZip.loadAsync(file.bytes);
    for (const part of [
      "[Content_Types].xml",
      "_rels/.rels",
      "xl/workbook.xml",
      "xl/_rels/workbook.xml.rels",
      "xl/styles.xml",
      "xl/worksheets/sheet1.xml",
      "xl/worksheets/sheet2.xml",
      "xl/worksheets/sheet3.xml",
      "docProps/core.xml",
      "docProps/app.xml",
    ])
      expect(zip.file(part), part).not.toBeNull();
    expect(
      Object.keys(zip.files).some((name) =>
        /vba|externalLinks|connections/i.test(name),
      ),
    ).toBe(false);
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(file.bytes.buffer);
    expect(workbook.getWorksheet("Report")!.getCell("A2").value).toBe(literal);
    expect(workbook.getWorksheet("Products")!.getCell("A2").value).toBe(
      literal,
    );
    expect(
      await zip.file("xl/worksheets/sheet3.xml")!.async("string"),
    ).toContain("&amp;B &lt;tag&gt;");
    expect(
      await zip.file("xl/_rels/workbook.xml.rels")!.async("string"),
    ).not.toContain('TargetMode="External"');
  });

  it("exports an empty reporting scope without inventing records", async () => {
    const empty = { ...report, metrics: [], rows: [], products: [] };
    expect(
      JSON.parse(
        new TextDecoder().decode(
          (await createReportExport(empty, "JSON")).bytes,
        ),
      ).periods,
    ).toEqual([]);
    const pptx = await JSZip.loadAsync(
      (await createReportExport(empty, "PowerPoint")).bytes,
    );
    expect(await pptx.file("ppt/slides/slide2.xml")!.async("string")).toContain(
      "No records in this report period.",
    );
    const pdf = new TextDecoder().decode(
      (await createReportExport(empty, "PDF")).bytes,
    );
    expect(pdf).toContain("No products in this report scope.");
    const emptyWorkbook = new ExcelJS.Workbook();
    await emptyWorkbook.xlsx.load(
      (await createReportExport(empty, "Excel")).bytes.buffer,
    );
    expect(emptyWorkbook.getWorksheet("Periods")!.rowCount).toBe(1);
    expect(emptyWorkbook.getWorksheet("Products")!.rowCount).toBe(1);
  });

  it("keeps a disabled comparison off and an absent baseline distinct from a zero change", async () => {
    const off = { ...report, comparisonEnabled: false };
    const csv = new TextDecoder().decode(
      (await createReportExport(off, "CSV")).bytes,
    );
    expect(csv).toContain("Net revenue,18360,$183.60,Off,");
    const noBaseline = {
      ...report,
      metrics: [{ ...report.metrics[0], change: null }],
    };
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(
      (await createReportExport(noBaseline, "Excel")).bytes.buffer,
    );
    expect(workbook.getWorksheet("Report")!.getCell("C8").value).toBe(
      "No baseline",
    );
  });

  it("reports unsupported browser downloads without claiming success", async () => {
    await expect(requestReportDownload(report, "CSV")).rejects.toThrow(
      "This browser cannot create a local download",
    );
  });

  it("keeps a usable fallback URL when automatic download is blocked, and releases it on request", () => {
    const revoke = vi.fn();
    const remove = vi.fn();
    const link = {
      download: "",
      click: () => {
        throw new Error("blocked");
      },
      remove,
    };
    vi.stubGlobal("URL", {
      createObjectURL: () => "blob:demo-file",
      revokeObjectURL: revoke,
    });
    vi.stubGlobal("document", {
      createElement: () => link,
      body: { appendChild: vi.fn() },
    });
    const result = requestFileDownload({
      bytes: new Uint8Array([1, 2]),
      filename: "sample.csv",
      mimeType: "text/csv",
    });
    expect(result.status).toBe("manual");
    expect(result.url).toBe("blob:demo-file");
    expect(result.message).toContain("blocked");
    expect(remove).toHaveBeenCalledOnce();
    expect(revoke).not.toHaveBeenCalled();
    result.dispose();
    expect(revoke).toHaveBeenCalledWith("blob:demo-file");
  });
});
