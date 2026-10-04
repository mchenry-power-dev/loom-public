import type { ReportData } from "../selectors";
import {
  EXPORT_DISCLOSURE,
  EXPORT_SCOPE,
  METRIC_LABELS,
  METRIC_DEFINITIONS,
  MONEY_METRICS,
  RATE_METRICS,
} from "./common";

// A bounded SpreadsheetML writer for this demo's three report sheets. JSZip
// supplies ZIP packaging; no general workbook engine or Node polyfills ship.
// Structure: https://learn.microsoft.com/office/open-xml/spreadsheet/structure-of-a-spreadsheetml-document
const NS = "http://schemas.openxmlformats.org/spreadsheetml/2006/main";
const REL =
  "http://schemas.openxmlformats.org/officeDocument/2006/relationships";
const XML = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
const xml = (value: string) =>
  value
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\uFFFE\uFFFF]/g, "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
const column = (index: number): string =>
  index < 26
    ? String.fromCharCode(65 + index)
    : column(Math.floor(index / 26) - 1) + column(index % 26);
type Cell = { value: string | number; style?: number; formula?: string };
type Sheet = {
  name: string;
  widths: number[];
  rows: Cell[][];
  header: number;
  freeze?: boolean;
  filterEnd?: number;
  merges?: string[];
};
const text = (value: string, style = 0): Cell => ({ value, style });
const number = (value: number, style = 9): Cell => {
  if (!Number.isFinite(value))
    throw new Error("This report contains an invalid numeric value.");
  return { value, style };
};
const metricStyle = (id: string) =>
  MONEY_METRICS.has(id) ? 2 : RATE_METRICS.has(id) ? 3 : 9;
const metricValue = (id: string, value: number) =>
  MONEY_METRICS.has(id) || RATE_METRICS.has(id) ? value / 100 : value;

function worksheet(sheet: Sheet) {
  const end = `${column(sheet.widths.length - 1)}${sheet.rows.length}`;
  const rows = sheet.rows
    .map(
      (cells, row) =>
        `<row r="${row + 1}" ht="${row + 1 === sheet.header ? 34 : sheet.name === "Report" && row + 1 > 7 && cells.length > 1 ? 42 : row === 1 && sheet.name === "Report" ? 27 : 22}" customHeight="1">${cells
          .map((cell, col) => {
            const attrs = `r="${column(col)}${row + 1}" s="${row + 1 === sheet.header ? 1 : (cell.style ?? 0)}"`;
            // Inline strings cannot become formulas, even if user input starts with =.
            return typeof cell.value === "string"
              ? `<c ${attrs} t="inlineStr"><is><t xml:space="preserve">${xml(cell.value)}</t></is></c>`
              : `<c ${attrs}>${cell.formula ? `<f>${xml(cell.formula)}</f>` : ""}<v>${cell.value}</v></c>`;
          })
          .join("")}</row>`,
    )
    .join("");
  return (
    XML +
    `<worksheet xmlns="${NS}"><sheetPr><pageSetUpPr fitToPage="1"/></sheetPr><dimension ref="A1:${end}"/><sheetViews><sheetView showGridLines="0" workbookViewId="0">${sheet.freeze ? '<pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/><selection pane="bottomLeft" activeCell="A2" sqref="A2"/>' : ""}</sheetView></sheetViews><sheetFormatPr defaultRowHeight="22"/><cols>${sheet.widths.map((width, index) => `<col min="${index + 1}" max="${index + 1}" width="${width}" customWidth="1"/>`).join("")}</cols><sheetData>${rows}</sheetData>${sheet.filterEnd ? `<autoFilter ref="A1:${column(sheet.widths.length - 1)}${sheet.filterEnd}"/>` : ""}${sheet.merges?.length ? `<mergeCells count="${sheet.merges.length}">${sheet.merges.map((ref) => `<mergeCell ref="${ref}"/>`).join("")}</mergeCells>` : ""}<pageMargins left="0.3" right="0.3" top="0.4" bottom="0.4" header="0.2" footer="0.2"/><pageSetup paperSize="9" orientation="landscape" fitToWidth="1" fitToHeight="0"/></worksheet>`
  );
}

function styles() {
  const formats = ['"$"#,##0.00', "0.0%", '0.0" pp"', "mmm d, yyyy"];
  const style = (
    font = 0,
    fill = 0,
    numFmt = 0,
    alignment = "left",
    wrap = false,
  ) =>
    `<xf numFmtId="${numFmt}" fontId="${font}" fillId="${fill}" borderId="0" xfId="0" applyFont="1" applyFill="1" applyNumberFormat="1" applyAlignment="1"><alignment horizontal="${alignment}" vertical="center"${wrap ? ' wrapText="1"' : ""}/></xf>`;
  const cells = [
    style(),
    style(1, 2, 0, "center", true),
    style(0, 0, 164, "right"),
    style(0, 0, 165, "right"),
    style(0, 0, 166, "right"),
    style(0, 0, 167),
    style(2),
    style(3),
    style(0, 0, 0, "left", true),
    style(0, 0, 3, "right"),
  ];
  return (
    XML +
    `<styleSheet xmlns="${NS}"><numFmts count="4">${formats.map((format, index) => `<numFmt numFmtId="${164 + index}" formatCode="${xml(format)}"/>`).join("")}</numFmts><fonts count="4"><font><sz val="11"/><color rgb="FF24212B"/><name val="Arial"/></font><font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Arial"/></font><font><b/><sz val="16"/><color rgb="FF24212B"/><name val="Arial"/></font><font><i/><sz val="10"/><color rgb="FF66616F"/><name val="Arial"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF54448A"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="${cells.length}">${cells.join("")}</cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles><dxfs count="0"/></styleSheet>`
  );
}

export async function createWorkbook(
  data: ReportData,
): Promise<Uint8Array<ArrayBuffer>> {
  const JSZip = (await import("jszip")).default;
  const summary: Sheet = {
    name: "Report",
    widths: [36, 26, 22, 22, 80],
    header: 7,
    rows: [
      [],
      [text(data.title, 6)],
      [text(data.periodLabel)],
      [text(`Fixed demo snapshot: ${data.snapshot.slice(0, 10)}`)],
      [text(EXPORT_DISCLOSURE, 7)],
      [],
      ["Metric", "Value", "Change", "Change unit", "Definition"].map((value) =>
        text(value),
      ),
    ],
    merges: ["A2:E2", "A3:E3", "A4:E4", "A5:E5"],
  };
  for (const metric of data.metrics) {
    const change = !data.comparisonEnabled
      ? text("Off")
      : metric.change === null
        ? text("No baseline")
        : number(
            metric.changeUnit === "%" ? metric.change / 100 : metric.change,
            metric.changeUnit === "%" ? 3 : 4,
          );
    summary.rows.push([
      text(metric.label),
      number(metricValue(metric.id, metric.value), metricStyle(metric.id)),
      change,
      text(
        !data.comparisonEnabled
          ? ""
          : metric.changeUnit === "pp"
            ? "Percentage points"
            : "Percent",
      ),
      text(METRIC_DEFINITIONS[metric.id], 8),
    ]);
  }
  summary.rows.push(
    [],
    [text("Source: browser-local synthetic Loom demo records.", 7)],
    [
      text(
        "Money is USD. Period detail and product rows use the same report scope.",
        7,
      ),
    ],
  );
  summary.merges!.push(
    `A${summary.rows.length - 1}:E${summary.rows.length - 1}`,
    `A${summary.rows.length}:E${summary.rows.length}`,
  );
  const metricIds = data.metrics.map((metric) => metric.id);
  const periods: Sheet = {
    name: "Periods",
    widths: [20, ...metricIds.map(() => 27)],
    header: 1,
    freeze: true,
    filterEnd: data.rows.length + 1,
    rows: [
      [
        text("Period start"),
        ...metricIds.map((id) =>
          text(
            `${METRIC_LABELS[id]}${MONEY_METRICS.has(id) ? " (USD)" : RATE_METRICS.has(id) ? " (%)" : ""}`,
          ),
        ),
      ],
      ...data.rows.map((row) => [
        number(
          Date.parse(`${row.date.slice(0, 10)}T00:00:00.000Z`) / 86400000 +
            25569,
          5,
        ),
        ...metricIds.map((id) =>
          number(metricValue(id, row[id]), metricStyle(id)),
        ),
      ]),
    ],
  };
  const products: Sheet = {
    name: "Products",
    widths: [34, 15, 15, 23, 23],
    header: 1,
    freeze: true,
    filterEnd: data.products.length + 1,
    rows: [
      ["Product", "Orders", "Units", "Net revenue (USD)", "Revenue share"].map(
        (value) => text(value),
      ),
      ...data.products.map((product) => [
        text(product.name),
        number(product.orders),
        number(product.units),
        number(product.netRevenue / 100, 2),
        number(product.share / 100, 3),
      ]),
    ],
  };
  // Useful additive totals remain editable formulas with cached values. Orders
  // are deliberately not summed: one order can contain more than one product.
  if (data.products.length) {
    const end = products.rows.length;
    products.rows.push(
      [],
      [
        text("Total units and revenue"),
        text(""),
        {
          ...number(
            data.products.reduce((sum, product) => sum + product.units, 0),
          ),
          formula: `SUM(C2:C${end})`,
        },
        {
          ...number(
            data.products.reduce(
              (sum, product) => sum + product.netRevenue,
              0,
            ) / 100,
            2,
          ),
          formula: `SUM(D2:D${end})`,
        },
      ],
    );
  }
  const sheets = [summary, periods, products];
  const zip = new JSZip();
  const write = (path: string, source: string) =>
    zip.file(path, source, { date: new Date("2026-01-01T00:00:00Z") });
  write(
    "[Content_Types].xml",
    XML +
      `<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${sheets.map((_, index) => `<Override PartName="/xl/worksheets/sheet${index + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join("")}<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/><Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/></Types>`,
  );
  const relationships = (rows: [string, string, string][]) =>
    XML +
    `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${rows.map(([id, type, target]) => `<Relationship Id="${id}" Type="${type}" Target="${target}"/>`).join("")}</Relationships>`;
  write(
    "_rels/.rels",
    relationships([
      ["rId1", `${REL}/officeDocument`, "xl/workbook.xml"],
      [
        "rId2",
        "http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties",
        "docProps/core.xml",
      ],
      ["rId3", `${REL}/extended-properties`, "docProps/app.xml"],
    ]),
  );
  write(
    "xl/workbook.xml",
    XML +
      `<workbook xmlns="${NS}" xmlns:r="${REL}"><workbookPr date1904="0"/><bookViews><workbookView/></bookViews><sheets>${sheets.map((sheet, index) => `<sheet name="${sheet.name}" sheetId="${index + 1}" r:id="rId${index + 1}"/>`).join("")}</sheets><calcPr calcId="0" fullCalcOnLoad="1"/></workbook>`,
  );
  write(
    "xl/_rels/workbook.xml.rels",
    relationships([
      ...sheets.map((_, index): [string, string, string] => [
        `rId${index + 1}`,
        `${REL}/worksheet`,
        `worksheets/sheet${index + 1}.xml`,
      ]),
      ["rId4", `${REL}/styles`, "styles.xml"],
    ]),
  );
  write("xl/styles.xml", styles());
  sheets.forEach((sheet, index) =>
    write(`xl/worksheets/sheet${index + 1}.xml`, worksheet(sheet)),
  );
  write(
    "docProps/core.xml",
    XML +
      `<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:creator>Loom public demo</dc:creator><dc:title>${xml(data.title)}</dc:title><dc:subject>${xml(EXPORT_SCOPE)}</dc:subject><dcterms:created xsi:type="dcterms:W3CDTF">${xml(data.snapshot)}</dcterms:created><dcterms:modified xsi:type="dcterms:W3CDTF">${xml(data.snapshot)}</dcterms:modified></cp:coreProperties>`,
  );
  write(
    "docProps/app.xml",
    XML +
      '<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties"><Application>Loom public demo</Application></Properties>',
  );
  return new Uint8Array(
    await zip.generateAsync({ type: "arraybuffer", compression: "DEFLATE" }),
  );
}
