import { useEffect, useRef, useState } from "react";
import {
  Download,
  FileText,
  Presentation,
  Sheet,
  Sparkles,
  Mail,
  Users,
  Hash,
  Smartphone,
  FileJson,
  Table2,
} from "lucide-react";
import type { Destination, OutputFormat } from "../domain/model";
import type { ReportData } from "../selectors";
import { requestReportDownload, type DownloadResult } from "../exports";
import type { ExportFormat } from "../exports";
import { Button, Modal } from "./ui";
export const FORMAT_ICONS = {
  PDF: FileText,
  PowerPoint: Presentation,
  Excel: Sheet,
  "AI Summary": Sparkles,
  CSV: Table2,
  JSON: FileJson,
};
export const DESTINATION_ICONS = {
  Email: Mail,
  Teams: Users,
  Slack: Hash,
  Text: Smartphone,
};
export function FormatIcon({ format }: { format: ExportFormat }) {
  const Icon = FORMAT_ICONS[format];
  return (
    <Icon
      size={18}
      className={`format-icon format-${format.replaceAll(" ", "-").toLowerCase()}`}
      aria-hidden="true"
    />
  );
}
export function DestinationIcon({ destination }: { destination: Destination }) {
  const Icon = DESTINATION_ICONS[destination];
  return (
    <Icon
      size={18}
      className={`destination-icon destination-${destination.toLowerCase()}`}
      aria-hidden="true"
    />
  );
}
export function ReportExport({
  data,
  onClose,
  formats = ["PDF", "PowerPoint", "Excel", "CSV", "AI Summary"],
  title = "Export report",
}: {
  data: ReportData;
  onClose: () => void;
  formats?: (OutputFormat | "CSV" | "JSON")[];
  title?: string;
}) {
  const [busy, setBusy] = useState<ExportFormat | null>(null);
  const [error, setError] = useState("");
  const [downloads, setDownloads] = useState<DownloadResult[]>([]);
  const active = useRef(true);
  const results = useRef<DownloadResult[]>([]);
  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
      results.current.forEach((result) => result.dispose());
    };
  }, []);
  async function download(format: ExportFormat) {
    if (busy) return;
    setBusy(format);
    setError("");
    try {
      const result = await requestReportDownload(data, format);
      if (!active.current) {
        result.dispose();
        return;
      }
      results.current.push(result);
      setDownloads([...results.current]);
    } catch (cause) {
      if (active.current)
        setError(
          cause instanceof Error
            ? cause.message
            : "The file could not be created. Try another format.",
        );
    } finally {
      if (active.current) setBusy(null);
    }
  }
  return (
    <Modal title={title} onClose={onClose}>
      <div className="stack">
        <div>
          <h3>{data.title}</h3>
          <p>{data.periodLabel}</p>
          <small>Sample data. Files are created in this browser.</small>
        </div>
        <div className="export-format-list">
          {formats.map((format) => (
            <Button
              key={format}
              onClick={() => download(format)}
              disabled={busy !== null}
            >
              <FormatIcon format={format} />
              {busy === format
                ? "Preparing file…"
                : format === "AI Summary"
                  ? "Sample summary (JSON)"
                  : format}
              <Download size={16} />
            </Button>
          ))}
        </div>
        <p>
          PDF is a one-page summary. PowerPoint includes editable tables and a
          chart. Excel and CSV include the report data. The summary uses a fixed
          template with no live model.
        </p>
        {error && (
          <div role="alert" className="error">
            {error}
          </div>
        )}
        {downloads.map((result, index) => (
          <div className="notice" key={index}>
            <p>{result.message}</p>
            <a href={result.url} download={result.filename}>
              Download {result.filename}
            </a>
          </div>
        ))}
      </div>
    </Modal>
  );
}
