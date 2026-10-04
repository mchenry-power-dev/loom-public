import type { ReportData } from "../selectors";
import {
  bytesOf,
  filenameFor,
  reportCsv,
  reportSummary,
  type ExportFile,
  type ExportFormat,
} from "./common";
export { csvBytes, csvCell, reportSummary } from "./common";
export type { ExportFile, ExportFormat } from "./common";

/** Heavy file writers are fetched from the deployed bundle only after the user asks to export. */
export async function createReportExport(
  data: ReportData,
  format: ExportFormat,
): Promise<ExportFile> {
  switch (format) {
    case "PDF":
      return {
        bytes: await (await import("./pdf")).createPdf(data),
        filename: filenameFor(data, "pdf"),
        mimeType: "application/pdf",
      };
    case "PowerPoint":
      return {
        bytes: await (await import("./powerpoint")).createPowerPoint(data),
        filename: filenameFor(data, "pptx"),
        mimeType:
          "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      };
    case "Excel":
      return {
        bytes: await (await import("./workbook")).createWorkbook(data),
        filename: filenameFor(data, "xlsx"),
        mimeType:
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      };
    case "CSV":
      return {
        bytes: reportCsv(data),
        filename: filenameFor(data, "csv"),
        mimeType: "text/csv;charset=utf-8",
      };
    case "JSON":
    case "AI Summary":
      return {
        bytes: bytesOf(JSON.stringify(reportSummary(data), null, 2) + "\n"),
        filename: filenameFor(data, "json"),
        mimeType: "application/json;charset=utf-8",
      };
    default:
      throw new Error("Choose an available export format.");
  }
}

export interface DownloadResult {
  status: "requested" | "manual";
  filename: string;
  url: string;
  message: string;
  /** Call when the fallback link is removed. Keeping it alive permits a second manual click. */
  dispose: () => void;
}

/** The browser does not expose save completion; report only that a download was requested. */
export function requestFileDownload(file: ExportFile): DownloadResult {
  if (
    typeof document === "undefined" ||
    typeof URL.createObjectURL !== "function"
  ) {
    throw new Error(
      "This browser cannot create a local download. Try an up-to-date browser. Your report remains unchanged.",
    );
  }
  let url: string;
  try {
    url = URL.createObjectURL(new Blob([file.bytes], { type: file.mimeType }));
  } catch {
    throw new Error(
      "The download could not be prepared. Try a smaller reporting period or another format.",
    );
  }
  const result: DownloadResult = {
    status: "requested",
    filename: file.filename,
    url,
    message: "Download requested. If it did not start, use the download link.",
    dispose: () => URL.revokeObjectURL(url),
  };
  const link = document.createElement("a");
  try {
    link.href = url;
    link.download = file.filename;
    link.rel = "noopener";
    link.hidden = true;
    document.body.appendChild(link);
    if ("download" in link) link.click();
    else {
      result.status = "manual";
      result.message = "Use the download link to save this local file.";
    }
  } catch {
    result.status = "manual";
    result.message =
      "Automatic download was blocked. Use the download link to save this local file.";
  } finally {
    link.remove();
  }
  return result;
}

export async function requestReportDownload(
  data: ReportData,
  format: ExportFormat,
) {
  try {
    return requestFileDownload(await createReportExport(data, format));
  } catch (error) {
    const detail =
      error instanceof Error && error.message.startsWith("This browser")
        ? error.message
        : "The export could not be created. Try again or choose CSV. Your report remains unchanged.";
    throw new Error(detail);
  }
}
