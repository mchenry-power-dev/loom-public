import { useEffect, useState } from "react";
import {
  BarChart3,
  Ellipsis,
  SlidersHorizontal,
  Plus,
  Save,
  RotateCcw,
  Download,
  Bell,
  LayoutGrid,
  Sparkles,
  Trash2,
} from "lucide-react";
import type {
  MetricId,
  Report,
  ReportVisual,
  VisualType,
} from "../domain/model";
import { initialReports } from "../fixtures";
import {
  METRIC_LABELS,
  METRIC_DEFINITIONS,
  selectReportData,
  money,
} from "../selectors";
import { validateReport } from "../domain/validation";
import { useDemo } from "../components/store";
import { navigate, useUnsavedChanges } from "../components/router";
import { uid } from "../components/format";
import {
  Button,
  Field,
  IconButton,
  Modal,
  Panel,
  Select,
} from "../components/ui";
import { ReportChart } from "../components/ReportChart";
import { ReportExport } from "../components/ReportExport";
import { InsightPanel } from "../components/InsightPanel";
import { changeLabel } from "../exports/common";
import "./reports-automations.css";

const METRICS = Object.keys(METRIC_LABELS) as MetricId[];
const clone = <T,>(value: T): T => structuredClone(value);

export default function Reports({ route = "/reports" }: { route?: string }) {
  const { state, dispatch, notify } = useDemo();
  const reportId = route.split("?")[0].split("/")[2];
  const selected =
    state.reports.find((report) => report.id === reportId) ??
    state.reports[0] ??
    initialReports()[0];
  const requestedPeriod = new URLSearchParams(route.split("?")[1]).get(
    "period",
  );
  const contextual = {
    ...selected,
    period: ["7d", "30d", "90d"].includes(requestedPeriod ?? "")
      ? (requestedPeriod as Report["period"])
      : selected.period,
  };
  const [draft, setDraft] = useState<Report>(() => clone(contextual));
  const [baseline, setBaseline] = useState(() => JSON.stringify(contextual));
  const [saveMode, setSaveMode] = useState<"save" | "copy" | null>(null);
  const [name, setName] = useState("");
  const [metricsOpen, setMetricsOpen] = useState(false);
  const [more, setMore] = useState(false);
  const [visual, setVisual] = useState<ReportVisual | null>(null);
  const [exportOpen, setExportOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [replacement, setReplacement] = useState("");
  const [errors, setErrors] = useState<string[]>([]);
  const dirty = JSON.stringify(draft) !== baseline;
  const guard = useUnsavedChanges(dirty);
  useEffect(() => {
    setDraft(clone(contextual));
    setBaseline(JSON.stringify(contextual));
    setErrors([]);
  }, [route]);
  const data = selectReportData(state, draft);
  const matchedInsight = state.insights.find(
    (insight) =>
      insight.reportId === selected.id && insight.category !== "Operations",
  );
  const cards = draft.visuals.find((item) => item.type === "cards");
  const firstChart = draft.visuals.find((item) => item.type !== "cards");
  const linked =
    state.automations.filter((automation) => automation.reportId === draft.id)
      .length +
    state.insights.filter((insight) => insight.reportId === draft.id).length;
  const update = (changes: Partial<Report>) =>
    setDraft((current) => ({ ...current, ...changes }));
  function setMetrics(metrics: MetricId[]) {
    if (!metrics.length) {
      setErrors(["Keep at least one report metric."]);
      return;
    }
    setErrors([]);
    update({
      metrics,
      visuals: draft.visuals.map((item) => ({
        ...item,
        metrics:
          item.type === "cards"
            ? metrics
            : item.metrics.filter((metric) => metrics.includes(metric)).length
              ? item.metrics.filter((metric) => metrics.includes(metric))
              : [metrics[0]],
      })),
    });
  }
  function saveReport() {
    const report = {
      ...draft,
      id: saveMode === "copy" ? uid("report") : draft.id,
      name: name.trim(),
      updatedAt: state.snapshot,
    };
    const issues = validateReport(report);
    if (issues.length) {
      setErrors(issues);
      return;
    }
    if (dispatch({ type: "report/save", report })) {
      setDraft(report);
      setBaseline(JSON.stringify(report));
      setSaveMode(null);
      setErrors([]);
      notify("Report saved in this demo. It is available in Automations.");
      setTimeout(() => navigate(`/reports/${report.id}`), 0);
    }
  }
  function saveVisual() {
    if (!visual) return;
    if (!visual.title.trim() || !visual.metrics.length) {
      setErrors(["Give this visual a title and at least one metric."]);
      return;
    }
    update({
      visuals: draft.visuals.some((item) => item.id === visual.id)
        ? draft.visuals.map((item) => (item.id === visual.id ? visual : item))
        : [...draft.visuals, visual],
    });
    setVisual(null);
    setErrors([]);
  }
  return (
    <div className="reports-workspace">
      <div className="report-main">
        <Panel className="report-builder">
          <div className="panel-header">
            <div className="section-heading">
              <span className="icon-tile">
                <BarChart3 />
              </span>
              <div>
                <h2>Report builder</h2>
                <p>
                  Choose a template, customize your metrics, and preview your
                  report.
                </p>
              </div>
            </div>
            <Field label="Saved report">
              <Select
                aria-label="Saved report"
                value={selected.id}
                onChange={(event) => navigate(`/reports/${event.target.value}`)}
              >
                {state.reports.map((report) => (
                  <option key={report.id} value={report.id}>
                    {report.name}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <div className="report-builder-controls">
            <Field label="Template">
              <Select
                value={draft.template}
                onChange={(event) => {
                  const template = initialReports().find(
                    (report) => report.template === event.target.value,
                  );
                  if (template)
                    update({
                      template: template.template,
                      metrics: template.metrics,
                      visuals: clone(template.visuals),
                      purpose: template.purpose,
                      breakdown: template.breakdown,
                    });
                }}
              >
                {initialReports().map((report) => (
                  <option key={report.template}>{report.template}</option>
                ))}
              </Select>
            </Field>
            <Field label="Time grouping">
              <Select
                value={draft.grouping}
                onChange={(event) =>
                  update({ grouping: event.target.value as Report["grouping"] })
                }
              >
                <option value="day">Daily</option>
                <option value="week">Weekly</option>
                <option value="month">Monthly</option>
              </Select>
            </Field>
            <Field label="Compare to">
              <Select
                value={draft.compare ? "previous" : "off"}
                onChange={(event) =>
                  update({ compare: event.target.value === "previous" })
                }
              >
                <option value="previous">Previous period</option>
                <option value="off">No comparison</option>
              </Select>
            </Field>
            <IconButton
              icon={SlidersHorizontal}
              label="More report options"
              aria-expanded={more}
              onClick={() => setMore(!more)}
            />
          </div>
          {more && (
            <div className="report-extra form-grid">
              <Field label="Purpose">
                <input
                  maxLength={160}
                  value={draft.purpose}
                  onChange={(event) => update({ purpose: event.target.value })}
                />
              </Field>
              <Field label="Breakdown">
                <Select
                  value={draft.breakdown}
                  onChange={(event) =>
                    update({
                      breakdown: event.target.value as Report["breakdown"],
                    })
                  }
                >
                  <option value="none">None</option>
                  <option value="product">Product</option>
                  <option value="type">Purchase type</option>
                </Select>
              </Field>
            </div>
          )}
          <div className="report-metric-picker">
            <h3>Metrics</h3>
            <div className="metric-chips">
              {draft.metrics.map((metric) => (
                <button
                  key={metric}
                  className="metric-chip"
                  onClick={() =>
                    setMetrics(draft.metrics.filter((id) => id !== metric))
                  }
                  aria-label={`Remove ${METRIC_LABELS[metric]} metric`}
                >
                  <span aria-hidden="true">✓</span>
                  {METRIC_LABELS[metric]}
                </button>
              ))}
              <Button onClick={() => setMetricsOpen(true)}>
                <Plus size={16} />
                Add metric
              </Button>
            </div>
          </div>
        </Panel>
        <Panel className="report-preview">
          <div className="panel-header">
            <div>
              <h2>Report preview</h2>
              <p>
                {draft.name}
                {dirty ? " · Unsaved changes" : ""}
              </p>
            </div>
            <div className="toolbar">
              <Button
                aria-pressed={Boolean(cards)}
                onClick={() =>
                  update({
                    visuals: cards
                      ? draft.visuals.filter((item) => item.id !== cards.id)
                      : [
                          {
                            id: uid("visual"),
                            title: "Performance at a glance",
                            type: "cards",
                            metrics: draft.metrics,
                          },
                          ...draft.visuals,
                        ],
                  })
                }
              >
                <LayoutGrid size={16} />
                Metric Card(s)
              </Button>
              <Select
                aria-label="Primary chart type"
                value={firstChart?.type ?? "line"}
                onChange={(event) =>
                  firstChart
                    ? update({
                        visuals: draft.visuals.map((item) =>
                          item.id === firstChart.id
                            ? {
                                ...item,
                                type: event.target.value as VisualType,
                                metrics: [item.metrics[0]],
                              }
                            : item,
                        ),
                      })
                    : update({
                        visuals: [
                          ...draft.visuals,
                          {
                            id: uid("visual"),
                            title: METRIC_LABELS[draft.metrics[0]],
                            type: event.target.value as VisualType,
                            metrics: [draft.metrics[0]],
                          },
                        ],
                      })
                }
              >
                <option value="line">Line chart</option>
                <option value="bar">Bar chart</option>
                <option value="table">Data table</option>
              </Select>
              <Button
                onClick={() =>
                  setVisual({
                    id: uid("visual"),
                    title: "New report visual",
                    type: "line",
                    metrics: [draft.metrics[0]],
                  })
                }
              >
                <Plus size={16} />
                Add visual
              </Button>
            </div>
          </div>
          <div className="report-scope">
            <span>{data.periodLabel} · USD</span>
            <Field label="Reporting period">
              <Select
                aria-label="Reporting period"
                value={draft.period}
                onChange={(event) =>
                  update({ period: event.target.value as Report["period"] })
                }
              >
                <option value="7d">Last 7 days</option>
                <option value="30d">Last 30 days</option>
                <option value="90d">Last 90 days</option>
              </Select>
            </Field>
          </div>
          {draft.visuals.map((item) => (
            <section
              key={item.id}
              className={`report-visual ${item.type === "cards" ? "report-card-visual" : ""}`}
            >
              <div className="report-visual-heading">
                <h3>{item.title}</h3>
                <IconButton
                  icon={Ellipsis}
                  label={`Edit visual: ${item.title}`}
                  onClick={() => setVisual(clone(item))}
                />
              </div>
              {item.type === "cards" ? (
                <div className="report-metrics">
                  {data.metrics
                    .filter((metric) => item.metrics.includes(metric.id))
                    .map((metric) => (
                      <div key={metric.id} className="report-metric">
                        <span className="report-metric-label">
                          <span className="icon-tile">
                            <BarChart3 size={18} />
                          </span>
                          {metric.label}
                        </span>
                        <strong>{metric.formatted}</strong>
                        <small>
                          {draft.compare
                            ? changeLabel(metric.change, metric.changeUnit) +
                              " vs. previous period"
                            : "Selected reporting period"}
                        </small>
                      </div>
                    ))}
                </div>
              ) : (
                <ReportChart
                  data={data}
                  metric={item.metrics[0]}
                  type={item.type}
                  title={item.title}
                />
              )}
            </section>
          ))}
          {draft.breakdown === "product" && (
            <div className="report-breakdown">
              <h3>Product breakdown</h3>
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th>Orders</th>
                      <th>Net revenue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.products.map((product) => (
                      <tr key={product.id}>
                        <td>
                          <a href={`#/products/${product.id}`}>
                            {product.name}
                          </a>
                        </td>
                        <td>{product.orders}</td>
                        <td>{money(product.netRevenue)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          {draft.breakdown === "type" && (
            <div className="tinted">
              <h3>Purchase type breakdown</h3>
              <p>
                Subscription revenue:{" "}
                {money(
                  data.rows.reduce(
                    (sum, row) => sum + row.subscriptionRevenue,
                    0,
                  ),
                )}
                . One-time revenue:{" "}
                {money(
                  data.rows.reduce(
                    (sum, row) =>
                      sum + row.netRevenue - row.subscriptionRevenue,
                    0,
                  ),
                )}
                .
              </p>
            </div>
          )}
        </Panel>
        {errors.length > 0 && !saveMode && !visual && (
          <div className="error" role="alert">
            {errors.join(" ")}
          </div>
        )}
        <Panel className="report-footer">
          <div className="toolbar">
            <Button
              primary
              onClick={() => {
                setName(draft.name);
                setSaveMode("save");
                setErrors([]);
              }}
            >
              <Save size={16} />
              Save report
            </Button>
            <Button onClick={() => setResetOpen(true)}>
              <RotateCcw size={16} />
              Reset
            </Button>
            <Button onClick={() => setExportOpen(true)}>
              <Download size={16} />
              Export
            </Button>
            <Button
              onClick={() => {
                if (dirty || draft.period !== selected.period) {
                  setErrors([
                    "Save this report before linking it to an alert.",
                  ]);
                  return;
                }
                navigate(`/automations/new?report=${draft.id}&type=Alert`);
              }}
            >
              <Bell size={16} />
              Create alert
            </Button>
            <Button
              onClick={() => {
                setName(`${draft.name} copy`);
                setSaveMode("copy");
                setErrors([]);
              }}
            >
              Save as copy
            </Button>
            <IconButton
              icon={Trash2}
              label="Delete report"
              onClick={() => {
                setDeleteOpen(true);
                setReplacement("");
              }}
            />
          </div>
        </Panel>
      </div>
      <Panel className="report-insights">
        <div className="section-heading">
          <Sparkles size={30} />
          <div>
            <h2>Loom AI™ insights</h2>
            <p>Sample insights · No live model</p>
          </div>
        </div>
        <div className="tinted report-fact">
          <h3>{data.metrics[0]?.label} in this report</h3>
          <p>
            {data.metrics[0]?.formatted} for {data.periodLabel}.
          </p>
          <small>{draft.purpose || "Review the selected report scope."}</small>
        </div>
        {matchedInsight && draft.period === "30d" ? (
          <InsightPanel insight={matchedInsight} compact />
        ) : (
          <div className="report-definition">
            <h3>Report-specific sample explanation</h3>
            <p>
              The displayed values come from synthetic records for this period.
              Compare product mix and order counts before interpreting a change
              as a shift in demand.
            </p>
            <a href="#/insights">Explore store-wide sample insights</a>
          </div>
        )}
        <details className="report-definitions">
          <summary>Metric definitions</summary>
          {draft.metrics.map((metric) => (
            <div key={metric}>
              <strong>{METRIC_LABELS[metric]}</strong>
              <p>{METRIC_DEFINITIONS[metric]}</p>
            </div>
          ))}
        </details>
      </Panel>
      {metricsOpen && (
        <Modal
          title="Choose report metrics"
          onClose={() => setMetricsOpen(false)}
        >
          <div className="stack">
            {METRICS.map((metric) => (
              <label className="check-line" key={metric}>
                <input
                  type="checkbox"
                  checked={draft.metrics.includes(metric)}
                  onChange={(event) =>
                    setMetrics(
                      event.target.checked
                        ? [...draft.metrics, metric]
                        : draft.metrics.filter((id) => id !== metric),
                    )
                  }
                />
                {METRIC_LABELS[metric]}
              </label>
            ))}
          </div>
          <div className="dialog-footer">
            <Button primary onClick={() => setMetricsOpen(false)}>
              Done
            </Button>
          </div>
        </Modal>
      )}
      {visual && (
        <Modal
          title={
            draft.visuals.some((item) => item.id === visual.id)
              ? "Edit report visual"
              : "Add report visual"
          }
          onClose={() => {
            setVisual(null);
            setErrors([]);
          }}
        >
          <div className="stack">
            <Field label="Visual title">
              <input
                value={visual.title}
                maxLength={80}
                onChange={(event) =>
                  setVisual({ ...visual, title: event.target.value })
                }
              />
            </Field>
            <Field label="Visual type">
              <Select
                value={visual.type}
                onChange={(event) =>
                  setVisual({
                    ...visual,
                    type: event.target.value as VisualType,
                    metrics:
                      event.target.value === "cards"
                        ? draft.metrics
                        : [visual.metrics[0]],
                  })
                }
              >
                <option value="line">Line chart</option>
                <option value="bar">Bar chart</option>
                <option value="table">Data table</option>
                <option value="cards">Metric cards</option>
              </Select>
            </Field>
            {visual.type !== "cards" && (
              <Field label="Visual metric">
                <Select
                  value={visual.metrics[0]}
                  onChange={(event) =>
                    setVisual({
                      ...visual,
                      metrics: [event.target.value as MetricId],
                    })
                  }
                >
                  {draft.metrics.map((metric) => (
                    <option value={metric} key={metric}>
                      {METRIC_LABELS[metric]}
                    </option>
                  ))}
                </Select>
              </Field>
            )}
            {errors.length > 0 && (
              <div className="error" role="alert">
                {errors.join(" ")}
              </div>
            )}
          </div>
          <div className="dialog-footer">
            {draft.visuals.some((item) => item.id === visual.id) && (
              <Button
                danger
                disabled={draft.visuals.length === 1}
                onClick={() => {
                  update({
                    visuals: draft.visuals.filter(
                      (item) => item.id !== visual.id,
                    ),
                  });
                  setVisual(null);
                }}
              >
                Remove visual
              </Button>
            )}
            <Button onClick={() => setVisual(null)}>Cancel</Button>
            <Button primary onClick={saveVisual}>
              Apply visual
            </Button>
          </div>
        </Modal>
      )}
      {saveMode && (
        <Modal
          title={saveMode === "copy" ? "Save report copy" : "Save report"}
          onClose={() => setSaveMode(null)}
        >
          <Field label="Report name">
            <input
              autoFocus
              value={name}
              maxLength={80}
              onChange={(event) => setName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  saveReport();
                }
              }}
            />
          </Field>
          {errors.length > 0 && (
            <div className="error" role="alert">
              {errors.join(" ")}
            </div>
          )}
          <div className="dialog-footer">
            <Button onClick={() => setSaveMode(null)}>Cancel</Button>
            <Button primary onClick={saveReport}>
              Save changes
            </Button>
          </div>
        </Modal>
      )}
      {resetOpen && (
        <Modal title="Reset report edits?" onClose={() => setResetOpen(false)}>
          <p>
            Restore the last saved report. Your other saved reports and
            automations stay unchanged.
          </p>
          <div className="dialog-footer">
            <Button onClick={() => setResetOpen(false)}>Keep editing</Button>
            <Button
              danger
              onClick={() => {
                setDraft(clone(selected));
                setBaseline(JSON.stringify(selected));
                setResetOpen(false);
                setErrors([]);
              }}
            >
              Reset edits
            </Button>
          </div>
        </Modal>
      )}
      {deleteOpen && (
        <Modal title="Delete this report?" onClose={() => setDeleteOpen(false)}>
          <p>
            {linked
              ? `${linked} automation or insight links use this report. Choose their replacement before deleting it.`
              : "Remove this saved report from the local demo."}
          </p>
          {linked > 0 && (
            <Field label="Replacement report">
              <Select
                value={replacement}
                onChange={(event) => setReplacement(event.target.value)}
              >
                <option value="">Choose a replacement</option>
                {state.reports
                  .filter((report) => report.id !== draft.id)
                  .map((report) => (
                    <option key={report.id} value={report.id}>
                      {report.name}
                    </option>
                  ))}
              </Select>
            </Field>
          )}
          <div className="dialog-footer">
            <Button onClick={() => setDeleteOpen(false)}>Cancel</Button>
            <Button
              danger
              disabled={
                state.reports.length <= 1 || Boolean(linked && !replacement)
              }
              onClick={() => {
                if (
                  dispatch({
                    type: "report/delete",
                    id: draft.id,
                    replacementId: replacement || undefined,
                  })
                ) {
                  setDeleteOpen(false);
                  setBaseline(JSON.stringify(draft));
                  notify("Report deleted; linked records were reassigned.");
                  setTimeout(
                    () =>
                      navigate(
                        `/reports/${replacement || state.reports.find((report) => report.id !== draft.id)?.id}`,
                      ),
                    0,
                  );
                }
              }}
            >
              Delete report
            </Button>
          </div>
          {state.reports.length <= 1 && <p>Keep at least one saved report.</p>}
        </Modal>
      )}
      {exportOpen && (
        <ReportExport data={data} onClose={() => setExportOpen(false)} />
      )}
      {guard.pending && (
        <Modal title="Discard unsaved changes?" onClose={guard.cancel}>
          <p>This report has unsaved edits.</p>
          <div className="dialog-footer">
            <Button onClick={guard.cancel}>Keep editing</Button>
            <Button danger onClick={guard.discard}>
              Discard changes
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
}
