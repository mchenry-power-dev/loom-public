import { useId, useState } from "react";
import type { MetricId } from "../domain/model";
import type { ReportData } from "../selectors";
import { formatMetric, METRIC_LABELS } from "../selectors";
import { Select } from "./ui";
import "../routes/reports-automations.css";

export function ReportChart({
  data,
  metric,
  type = "line",
  title,
}: {
  data: ReportData;
  metric: MetricId;
  type?: "line" | "bar" | "table";
  title?: string;
}) {
  const id = useId();
  const [inspection, setInspection] = useState(0);
  const rows = data.rows;
  const index = Math.min(inspection, Math.max(0, rows.length - 1));
  const max = Math.max(1, ...rows.map((row) => row[metric]));
  const plot = { x: 67, y: 24, width: 688, height: 210 };
  const x = (i: number) =>
    plot.x + ((i + 0.5) / Math.max(1, rows.length)) * plot.width;
  const y = (value: number) =>
    plot.y + plot.height - (value / max) * plot.height;
  const points = rows.map((row, i) => `${x(i)},${y(row[metric])}`).join(" ");
  const table = (
    <div className="report-data-scroll">
      <table>
        <caption className="visually-hidden">
          {title ?? METRIC_LABELS[metric]} for {data.periodLabel}
        </caption>
        <thead>
          <tr>
            <th scope="col">Period start</th>
            <th scope="col">{METRIC_LABELS[metric]}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.date}>
              <th scope="row">{row.date}</th>
              <td>{formatMetric(metric, row[metric])}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
  if (!rows.length)
    return (
      <p className="report-chart-empty">No records in this report period.</p>
    );
  if (type === "table") return table;
  return (
    <div className="report-chart">
      <svg viewBox="0 0 780 274" role="img" aria-labelledby={`${id}-title`}>
        <title id={`${id}-title`}>
          {title ?? METRIC_LABELS[metric]} by period. Exact values are available
          in the selector and data table below.
        </title>
        {[0, 0.25, 0.5, 0.75, 1].map((fraction) => (
          <g key={fraction}>
            <line
              x1={plot.x}
              x2={plot.x + plot.width}
              y1={y(max * fraction)}
              y2={y(max * fraction)}
              stroke="#e2e7f2"
            />
            <text x={plot.x - 8} y={y(max * fraction) + 4} textAnchor="end">
              {["netRevenue", "aov", "subscriptionRevenue"].includes(metric)
                ? `$${Math.round((max * fraction) / 100).toLocaleString("en-US")}`
                : ["retention", "refundRate"].includes(metric)
                  ? `${(max * fraction).toFixed(1)}%`
                  : Math.round(max * fraction)}
            </text>
          </g>
        ))}
        {type === "line" ? (
          <>
            <polygon
              points={`${x(0)},${y(0)} ${points} ${x(rows.length - 1)},${y(0)}`}
              fill="#7561ff"
              fillOpacity=".1"
            />
            <polyline
              points={points}
              fill="none"
              stroke="#6546ff"
              strokeWidth="2"
            />
          </>
        ) : (
          rows.map((row, i) => (
            <rect
              key={row.date}
              x={x(i) - (plot.width / rows.length) * 0.32}
              y={y(row[metric])}
              width={(plot.width / rows.length) * 0.64}
              height={Math.max(1, plot.height - (y(row[metric]) - plot.y))}
              fill={i === index ? "#4d32ff" : "#aa9dfd"}
            />
          ))
        )}
        {rows.map((row, i) => (
          <g
            key={row.date}
            onPointerEnter={() => setInspection(i)}
            onClick={() => setInspection(i)}
          >
            <circle
              cx={x(i)}
              cy={y(row[metric])}
              r={i === index ? 5 : 3}
              fill={i === index ? "#4d32ff" : "#8070d5"}
            />
            <circle cx={x(i)} cy={y(row[metric])} r="15" fill="transparent" />
            <title>
              {row.date}: {formatMetric(metric, row[metric])}
            </title>
          </g>
        ))}
        {rows
          .filter(
            (_, i) =>
              i === 0 ||
              i === rows.length - 1 ||
              i % Math.max(1, Math.ceil(rows.length / 6)) === 0,
          )
          .map((row) => (
            <text
              key={row.date}
              x={x(rows.indexOf(row))}
              y="256"
              textAnchor="middle"
            >
              {new Intl.DateTimeFormat("en-US", {
                month: "short",
                day: "numeric",
                timeZone: "UTC",
              }).format(new Date(`${row.date}T12:00:00Z`))}
            </text>
          ))}
      </svg>
      <div className="chart-inspector">
        <label htmlFor={`${id}-inspect`}>Inspect period</label>
        <Select
          id={`${id}-inspect`}
          value={index}
          onChange={(event) => setInspection(Number(event.target.value))}
        >
          {rows.map((row, i) => (
            <option key={row.date} value={i}>
              {row.date}
            </option>
          ))}
        </Select>
        <output aria-live="polite">
          {formatMetric(metric, rows[index][metric])}
        </output>
      </div>
      <details className="chart-data">
        <summary>View chart data</summary>
        {table}
      </details>
    </div>
  );
}
