import { useEffect, useRef, useState } from "react";
import {
  Bell,
  FileText,
  Sparkles,
  Settings2,
  Pause,
  Plus,
  Folder,
  Search,
  Ellipsis,
  X,
  Eye,
  Save,
  Send,
  ChevronLeft,
  Copy,
  Trash2,
  Play,
  CheckCircle2,
} from "lucide-react";
import type { Automation, Destination, OutputFormat } from "../domain/model";
import { nextAutomationRun, selectReportData } from "../selectors";
import { validateAutomation } from "../domain/validation";
import { useDemo } from "../components/store";
import { navigate, useUnsavedChanges } from "../components/router";
import { uid } from "../components/format";
import {
  Badge,
  Button,
  Empty,
  Field,
  IconButton,
  Modal,
  Panel,
  Select,
} from "../components/ui";
import {
  DestinationIcon,
  FormatIcon,
  ReportExport,
} from "../components/ReportExport";
import "./reports-automations.css";

const FORMATS: OutputFormat[] = ["PDF", "PowerPoint", "Excel", "AI Summary"];
const DESTINATIONS: Destination[] = ["Email", "Teams", "Slack", "Text"];
const DAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];
const recipientDefaults: Record<Destination, string> = {
  Email: "team@demo.example",
  Teams: "Sample commerce team",
  Slack: "#sample-operations",
  Text: "+1 202 555 0140",
};
const typeIcon = { Report: FileText, Alert: Bell, "AI briefing": Sparkles };
function scheduleDetail(automation: Automation) {
  return automation.cadence === "On trigger"
    ? `Revenue change exceeds ${automation.threshold}%`
    : `${automation.cadence === "Weekly" ? DAYS[automation.day] + ", " : automation.cadence === "Monthly" ? `Day ${automation.day}, ` : ""}${automation.time}`;
}
function nextRun(automation: Automation, snapshot: string) {
  if (automation.status === "Paused") return "Paused";
  if (automation.cadence === "On trigger") return "On trigger";
  const date = nextAutomationRun(automation, snapshot);
  return date
    ? new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
        timeZone: automation.timezone,
      }).format(new Date(date))
    : "Unavailable";
}

export default function Automations({
  route = "/automations",
}: {
  route?: string;
}) {
  const { state, dispatch, notify } = useDemo();
  const [path, queryString] = route.split("?");
  const params = new URLSearchParams(queryString);
  const id = path.split("/")[2];
  const saved = state.automations.find((automation) => automation.id === id);
  const editorOpen = Boolean(id);
  function blank(): Automation {
    return {
      id: uid("automation"),
      name: "Weekly performance snapshot",
      type: params.get("type") === "Alert" ? "Alert" : "Report",
      reportId: state.reports.some(
        (report) => report.id === params.get("report"),
      )
        ? params.get("report")!
        : (state.reports[0]?.id ?? ""),
      cadence: params.get("type") === "Alert" ? "On trigger" : "Weekly",
      day: 1,
      time: "08:00",
      timezone: state.timezone,
      formats: ["PDF"],
      destinations: ["Email"],
      recipients: { Email: "team@demo.example" },
      message: "Your sample commerce report.",
      summaryInstructions:
        "Summarize the selected report facts and one useful next investigation.",
      summaryInBody: true,
      attachments: true,
      failureRecipient: "",
      status: "Active",
      folder: "Weekly reporting",
      threshold: 10,
    };
  }
  const [draft, setDraft] = useState<Automation>(() =>
    structuredClone(saved ?? blank()),
  );
  const [baseline, setBaseline] = useState(() => JSON.stringify(draft));
  const [filter, setFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [folderView, setFolderView] = useState(false);
  const [folder, setFolder] = useState("All folders");
  const [sampleSetup, setSampleSetup] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [preview, setPreview] = useState<"preview" | "test" | null>(null);
  const [exportOpen, setExportOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [menu, setMenu] = useState<{
    id: string;
    left: number;
    top: number;
  } | null>(null);
  const trigger = useRef<HTMLButtonElement | null>(null);
  const guard = useUnsavedChanges(
    editorOpen && JSON.stringify(draft) !== baseline,
  );
  useEffect(() => {
    const next = structuredClone(saved ?? blank());
    setDraft(next);
    setBaseline(JSON.stringify(next));
    setErrors([]);
    setSampleSetup(false);
    setPreview(null);
  }, [route]);
  useEffect(() => {
    if (!menu) return;
    document
      .querySelector<HTMLButtonElement>(".automation-menu button")
      ?.focus({ preventScroll: true });
    const close = (event: Event) => {
      if (event instanceof KeyboardEvent && event.key !== "Escape") return;
      if (
        event.type === "click" &&
        (event.target as Element).closest(".automation-menu")
      )
        return;
      setMenu(null);
      if (event.type === "keydown") trigger.current?.focus();
    };
    window.addEventListener("keydown", close);
    window.addEventListener("click", close);
    return () => {
      window.removeEventListener("keydown", close);
      window.removeEventListener("click", close);
    };
  }, [menu]);
  const update = (changes: Partial<Automation>) =>
    setDraft((current) => ({ ...current, ...changes }));
  const rows = state.automations.filter(
    (automation) =>
      (filter === "All" || automation.type === filter) &&
      automation.name.toLowerCase().includes(search.toLowerCase()) &&
      (!folderView || folder === "All folders" || automation.folder === folder),
  );
  const report = state.reports.find((item) => item.id === draft.reportId);
  const data = report ? selectReportData(state, report) : null;
  const active = state.automations.filter(
    (automation) => automation.status === "Active",
  ).length;
  const summaryFacts =
    data?.metrics
      .map((metric) => `${metric.label}: ${metric.formatted}.`)
      .join(" ") ?? "";
  function save() {
    const issues = validateAutomation(state, draft);
    setErrors(issues);
    if (issues.length) return;
    if (
      dispatch({
        type: "automation/save",
        automation: { ...draft, name: draft.name.trim() },
      })
    ) {
      setBaseline(JSON.stringify(draft));
      notify(
        "Automation saved locally. No messages or schedules run outside this demo.",
      );
      setTimeout(() => navigate(`/automations/${draft.id}`), 0);
    }
  }
  function showPreview(kind: "preview" | "test") {
    const issues = validateAutomation(state, draft);
    setErrors(issues);
    if (issues.length) return;
    if (kind === "test" && (!saved || JSON.stringify(draft) !== baseline)) {
      setErrors(["Save this automation before preparing a local test."]);
      return;
    }
    if (kind === "test" && !dispatch({ type: "automation/test", id: draft.id }))
      return;
    setPreview(kind);
  }
  function duplicateAutomation(automation: Automation) {
    if (
      !dispatch({
        type: "automation/duplicate",
        id: automation.id,
        newId: uid("automation"),
      })
    )
      return;
    setMenu(null);
    notify("Automation duplicated as a paused local configuration.");
  }
  function toggleStatus(automation: Automation) {
    const status = automation.status === "Active" ? "Paused" : "Active";
    if (!dispatch({ type: "automation/status", id: automation.id, status }))
      return;
    if (automation.id === id) {
      update({ status });
      setBaseline(JSON.stringify({ ...JSON.parse(baseline), status }));
    }
    setMenu(null);
    notify(
      status === "Paused"
        ? "Automation paused locally."
        : "Automation resumed locally.",
    );
  }
  function deleteAutomation() {
    if (!deleteId || !dispatch({ type: "automation/delete", id: deleteId }))
      return;
    setDeleteId(null);
    notify("Automation deleted locally.");
    if (id === deleteId) {
      setBaseline(JSON.stringify(draft));
      setTimeout(() => navigate("/automations"), 0);
    }
  }
  function openMenu(
    event: React.MouseEvent<HTMLButtonElement>,
    automation: Automation,
  ) {
    event.stopPropagation();
    trigger.current = event.currentTarget;
    const box = event.currentTarget.getBoundingClientRect();
    setMenu(
      menu?.id === automation.id
        ? null
        : {
            id: automation.id,
            left: Math.max(
              8,
              Math.min(box.right - 204, window.innerWidth - 212),
            ),
            top: Math.min(box.bottom + 5, window.innerHeight - 230),
          },
    );
  }
  const formatIcons = (automation: Automation) => (
    <span className="automation-icons">
      {automation.formats.map((format) => (
        <span key={format} title={format} aria-label={format}>
          <FormatIcon format={format} />
        </span>
      ))}
    </span>
  );
  const destinationIcons = (automation: Automation) => (
    <span className="automation-icons">
      {automation.destinations.map((destination) => (
        <span
          key={destination}
          title={`${destination}: ${automation.recipients[destination]}`}
          aria-label={`${destination}: ${automation.recipients[destination]}`}
        >
          <DestinationIcon destination={destination} />
        </span>
      ))}
    </span>
  );
  return (
    <div className={`automations-workspace ${editorOpen ? "editor-open" : ""}`}>
      <div className="automation-stats">
        {[
          [
            Settings2,
            "Active automations",
            active,
            `${state.automations.length} configured in this browser`,
          ],
          [
            FileText,
            "Scheduled reports",
            state.automations.filter(
              (automation) => automation.type === "Report",
            ).length,
            "Saved report configurations",
          ],
          [
            Send,
            "Local tests",
            state.activity.filter((item) =>
              item.message.startsWith("Local test prepared"),
            ).length,
            "No delivery was sent",
          ],
          [
            Pause,
            "Paused",
            state.automations.length - active,
            "No next run while paused",
          ],
        ].map(([Icon, title, value, note]) => {
          const MetricIcon = Icon as typeof Settings2;
          return (
            <div className="automation-stat" key={String(title)}>
              <span>
                <span className="icon-tile">
                  <MetricIcon size={21} />
                </span>
                {String(title)}
              </span>
              <strong>{String(value)}</strong>
              <small>{String(note)}</small>
            </div>
          );
        })}
      </div>
      <div className="automation-columns">
        <Panel className="automation-center">
          <div className="panel-header">
            <div>
              <h2>Automation center</h2>
              <p>Manage your reports, alerts, and sample briefings.</p>
            </div>
            <Button primary onClick={() => navigate("/automations/new")}>
              <Plus size={16} />
              Create automation
            </Button>
          </div>
          <div className="automation-filters">
            <label className="automation-search">
              <Search size={16} />
              <input
                aria-label="Search automations"
                placeholder="Search automations…"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </label>
            <div className="automation-types" aria-label="Automation types">
              {[
                ["All", "All"],
                ["Reports", "Report"],
                ["Alerts", "Alert"],
                ["AI briefings", "AI briefing"],
              ].map(([label, value]) => (
                <Button
                  key={value}
                  aria-pressed={filter === value}
                  onClick={() => setFilter(value)}
                >
                  {label} (
                  {value === "All"
                    ? state.automations.length
                    : state.automations.filter(
                        (automation) => automation.type === value,
                      ).length}
                  )
                </Button>
              ))}
            </div>
            <Button
              aria-pressed={folderView}
              onClick={() => setFolderView(!folderView)}
            >
              <Folder size={16} />
              Folder view
            </Button>
          </div>
          {folderView && (
            <Field label="Automation folder">
              <Select
                value={folder}
                onChange={(event) => setFolder(event.target.value)}
              >
                <option>All folders</option>
                {[
                  ...new Set(
                    state.automations.map(
                      (automation) => automation.folder || "Unfiled",
                    ),
                  ),
                ].map((name) => (
                  <option key={name}>{name}</option>
                ))}
              </Select>
            </Field>
          )}
          {rows.length ? (
            <>
              <div className="automation-table-scroll">
                <table className="automation-table">
                  <thead>
                    <tr>
                      {[
                        "Name",
                        "Schedule / trigger",
                        "Type",
                        "Format",
                        "Destination",
                        "Next run",
                        "Status",
                      ].map((label) => (
                        <th key={label} scope="col">
                          {label}
                        </th>
                      ))}
                      <th aria-label="Actions" />
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((automation) => {
                      const Icon = typeIcon[automation.type];
                      return (
                        <tr
                          key={automation.id}
                          className={id === automation.id ? "selected" : ""}
                        >
                          <td>
                            <button
                              className="automation-name"
                              onClick={() =>
                                navigate(`/automations/${automation.id}`)
                              }
                            >
                              <span className="icon-tile">
                                <Icon size={18} />
                              </span>
                              <strong>{automation.name}</strong>
                            </button>
                          </td>
                          <td>
                            <span>{automation.cadence}</span>
                            <small>{scheduleDetail(automation)}</small>
                          </td>
                          <td>{automation.type}</td>
                          <td>{formatIcons(automation)}</td>
                          <td>
                            {destinationIcons(automation)}
                            <small>{automation.destinations.join(", ")}</small>
                          </td>
                          <td className="automation-next">
                            {nextRun(automation, state.snapshot)}
                          </td>
                          <td>
                            <Badge
                              tone={
                                automation.status === "Active"
                                  ? "green"
                                  : "neutral"
                              }
                            >
                              {automation.status}
                            </Badge>
                          </td>
                          <td>
                            <IconButton
                              icon={Ellipsis}
                              label={`Actions for ${automation.name}`}
                              aria-expanded={menu?.id === automation.id}
                              onClick={(event) => openMenu(event, automation)}
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="automation-mobile-list">
                {rows.map((automation) => {
                  const Icon = typeIcon[automation.type];
                  return (
                    <article
                      className="automation-mobile-card"
                      key={automation.id}
                    >
                      <div className="auto-card-heading">
                        <span className="icon-tile">
                          <Icon size={20} />
                        </span>
                        <h3>{automation.name}</h3>
                        <IconButton
                          icon={Ellipsis}
                          label={`Actions for ${automation.name}`}
                          onClick={(event) => openMenu(event, automation)}
                        />
                      </div>
                      <div className="auto-card-meta">
                        <span>
                          Type<strong>{automation.type}</strong>
                        </span>
                        <span>
                          Status
                          <Badge
                            tone={
                              automation.status === "Active"
                                ? "green"
                                : "neutral"
                            }
                          >
                            {automation.status}
                          </Badge>
                        </span>
                        <span>
                          Schedule
                          <strong>
                            {automation.cadence}
                            <small>{scheduleDetail(automation)}</small>
                          </strong>
                        </span>
                        <span>
                          Next run
                          <strong>{nextRun(automation, state.snapshot)}</strong>
                        </span>
                        <span>Formats{formatIcons(automation)}</span>
                        <span>Destinations{destinationIcons(automation)}</span>
                      </div>
                      <Button
                        onClick={() =>
                          navigate(`/automations/${automation.id}`)
                        }
                      >
                        Edit automation
                      </Button>
                    </article>
                  );
                })}
              </div>
              <div className="automation-list-footer">
                <span>
                  {rows.length} automation{rows.length === 1 ? "" : "s"}
                </span>
                <span>
                  {active} active · {state.automations.length - active} paused
                </span>
              </div>
            </>
          ) : (
            <Empty title="No automations match">
              Clear the search or choose another type or folder.
            </Empty>
          )}
          <p className="automation-local-note">
            Local configurations only. Schedules and reminders do not execute
            while the browser is closed.
          </p>
        </Panel>
        {editorOpen && (
          <Panel className="automation-editor">
            <div className="panel-header">
              <div>
                <h2>{saved ? "Edit automation" : "Create automation"}</h2>
                <p>
                  {JSON.stringify(draft) !== baseline
                    ? "Unsaved changes"
                    : saved
                      ? "Saved local configuration"
                      : "Draft"}
                </p>
              </div>
              <IconButton
                icon={X}
                label="Close automation editor"
                onClick={() => navigate("/automations")}
              />
            </div>
            <div className="toolbar automation-setup-modes">
              <Button
                aria-pressed={sampleSetup}
                onClick={() => setSampleSetup(true)}
              >
                <Sparkles size={16} />
                Use Loom AI
              </Button>
              <Button
                aria-pressed={!sampleSetup}
                onClick={() => setSampleSetup(false)}
              >
                <Settings2 size={16} />
                Configure manually
              </Button>
            </div>
            {sampleSetup && (
              <div className="tinted automation-example">
                <strong>Example workflow — no live AI.</strong>
                <p>
                  Weekly PDF and Excel report with a fixed sample summary for a
                  sample email destination.
                </p>
                <Button
                  onClick={() =>
                    update({
                      cadence: "Weekly",
                      day: 1,
                      time: "08:00",
                      formats: ["PDF", "Excel", "AI Summary"],
                      destinations: ["Email"],
                      recipients: {
                        ...draft.recipients,
                        Email: "team@demo.example",
                      },
                      summaryInBody: true,
                      attachments: true,
                    })
                  }
                >
                  Load example setup
                </Button>
              </div>
            )}
            <form
              className="automation-form"
              onSubmit={(event) => {
                event.preventDefault();
                save();
              }}
            >
              <Field label="Automation name">
                <input
                  value={draft.name}
                  maxLength={80}
                  onChange={(event) => update({ name: event.target.value })}
                />
              </Field>
              <div className="automation-source">
                <Field label="Report / data source">
                  <Select
                    value={draft.reportId}
                    onChange={(event) =>
                      update({ reportId: event.target.value })
                    }
                  >
                    {state.reports.map((report) => (
                      <option key={report.id} value={report.id}>
                        {report.name}
                      </option>
                    ))}
                  </Select>
                </Field>
                {report && <a href={`#/reports/${report.id}`}>View report ↗</a>}
              </div>
              <div className="form-grid">
                <Field label="Automation type">
                  <Select
                    value={draft.type}
                    onChange={(event) =>
                      update({
                        type: event.target.value as Automation["type"],
                        cadence:
                          event.target.value === "Alert"
                            ? "On trigger"
                            : draft.cadence === "On trigger"
                              ? "Weekly"
                              : draft.cadence,
                      })
                    }
                  >
                    <option>Report</option>
                    <option>Alert</option>
                    <option>AI briefing</option>
                  </Select>
                </Field>
                <Field label="Folder">
                  <input
                    value={draft.folder}
                    maxLength={50}
                    onChange={(event) => update({ folder: event.target.value })}
                  />
                </Field>
              </div>
              <fieldset>
                <legend>Schedule</legend>
                <div className="automation-schedule">
                  <Field label="Cadence">
                    <Select
                      value={draft.cadence}
                      onChange={(event) =>
                        update({
                          cadence: event.target.value as Automation["cadence"],
                          day: 1,
                        })
                      }
                    >
                      <option>Daily</option>
                      <option>Weekly</option>
                      <option>Monthly</option>
                      <option>On trigger</option>
                    </Select>
                  </Field>
                  {draft.cadence === "Weekly" && (
                    <Field label="Weekday">
                      <Select
                        value={draft.day}
                        onChange={(event) =>
                          update({ day: Number(event.target.value) })
                        }
                      >
                        {DAYS.map((day, index) => (
                          <option key={day} value={index}>
                            {day}
                          </option>
                        ))}
                      </Select>
                    </Field>
                  )}
                  {draft.cadence === "Monthly" && (
                    <Field label="Day of month">
                      <input
                        type="number"
                        min="1"
                        max="31"
                        value={draft.day}
                        onChange={(event) =>
                          update({ day: Number(event.target.value) })
                        }
                      />
                    </Field>
                  )}
                  {draft.cadence !== "On trigger" && (
                    <Field label="Schedule time">
                      <input
                        type="time"
                        value={draft.time}
                        onChange={(event) =>
                          update({ time: event.target.value })
                        }
                      />
                    </Field>
                  )}
                  <Field label="Time zone">
                    <Select
                      value={draft.timezone}
                      onChange={(event) =>
                        update({ timezone: event.target.value })
                      }
                    >
                      <option value="America/New_York">Eastern time</option>
                      <option value="America/Chicago">Central time</option>
                      <option value="America/Los_Angeles">Pacific time</option>
                      <option value="Europe/London">London</option>
                      <option value="UTC">UTC</option>
                    </Select>
                  </Field>
                </div>
                {draft.cadence === "On trigger" && (
                  <Field
                    label="Revenue change threshold (%)"
                    hint="Local test compares absolute net revenue change with the previous reporting period."
                  >
                    <input
                      type="number"
                      min="0"
                      max="1000"
                      value={draft.threshold}
                      onChange={(event) =>
                        update({ threshold: Number(event.target.value) })
                      }
                    />
                  </Field>
                )}
              </fieldset>
              <fieldset>
                <legend>
                  Output formats <small>Select multiple</small>
                </legend>
                <div className="automation-choices">
                  {FORMATS.map((format) => (
                    <label
                      className={draft.formats.includes(format) ? "chosen" : ""}
                      key={format}
                    >
                      <FormatIcon format={format} />
                      <span>{format}</span>
                      <input
                        aria-label={`${format} output`}
                        type="checkbox"
                        checked={draft.formats.includes(format)}
                        onChange={(event) =>
                          update({
                            formats: event.target.checked
                              ? [...draft.formats, format]
                              : draft.formats.filter(
                                  (value) => value !== format,
                                ),
                          })
                        }
                      />
                    </label>
                  ))}
                </div>
              </fieldset>
              <fieldset>
                <legend>
                  Delivery methods <small>Simulated destinations</small>
                </legend>
                <div className="automation-choices">
                  {DESTINATIONS.map((destination) => (
                    <label
                      className={
                        draft.destinations.includes(destination) ? "chosen" : ""
                      }
                      key={destination}
                    >
                      <DestinationIcon destination={destination} />
                      <span>{destination}</span>
                      <input
                        aria-label={`${destination} destination`}
                        type="checkbox"
                        checked={draft.destinations.includes(destination)}
                        onChange={(event) =>
                          update({
                            destinations: event.target.checked
                              ? [...draft.destinations, destination]
                              : draft.destinations.filter(
                                  (value) => value !== destination,
                                ),
                            recipients: {
                              ...draft.recipients,
                              [destination]:
                                draft.recipients[destination] ??
                                recipientDefaults[destination],
                            },
                          })
                        }
                      />
                    </label>
                  ))}
                </div>
              </fieldset>
              {draft.destinations.map((destination) => (
                <Field
                  key={destination}
                  label={`${destination} recipients`}
                  hint={
                    destination === "Email"
                      ? "Use .example addresses separated by commas."
                      : destination === "Slack"
                        ? "Use a sample #channel name."
                        : "A sample destination only. No connection is made."
                  }
                >
                  <input
                    value={draft.recipients[destination] ?? ""}
                    maxLength={200}
                    onChange={(event) =>
                      update({
                        recipients: {
                          ...draft.recipients,
                          [destination]: event.target.value,
                        },
                      })
                    }
                  />
                </Field>
              ))}
              <Field label="Message">
                <textarea
                  value={draft.message}
                  maxLength={500}
                  onChange={(event) => update({ message: event.target.value })}
                />
              </Field>
              <label className="check-line">
                <input
                  type="checkbox"
                  checked={draft.summaryInBody}
                  onChange={(event) =>
                    update({ summaryInBody: event.target.checked })
                  }
                />
                Include sample summary in message body
              </label>
              <details>
                <summary>Summary instructions</summary>
                <Field
                  label="Saved summary instructions"
                  hint="Saved configuration only. A live model does not interpret these instructions."
                >
                  <textarea
                    value={draft.summaryInstructions}
                    maxLength={500}
                    onChange={(event) =>
                      update({ summaryInstructions: event.target.value })
                    }
                  />
                </Field>
              </details>
              <details>
                <summary>Delivery & failure notifications</summary>
                <div className="stack">
                  <label className="check-line">
                    <input
                      type="checkbox"
                      checked={draft.attachments}
                      onChange={(event) =>
                        update({ attachments: event.target.checked })
                      }
                    />
                    Include selected file attachments in the simulation
                  </label>
                  <Field
                    label="Failure recipient"
                    hint="Optional .example address. No notifications are sent."
                  >
                    <input
                      value={draft.failureRecipient}
                      placeholder="operations@demo.example"
                      onChange={(event) =>
                        update({ failureRecipient: event.target.value })
                      }
                    />
                  </Field>
                  <Field label="Automation status">
                    <Select
                      value={draft.status}
                      onChange={(event) =>
                        update({
                          status: event.target.value as Automation["status"],
                        })
                      }
                    >
                      <option>Active</option>
                      <option>Paused</option>
                    </Select>
                  </Field>
                </div>
              </details>
              <section className="automation-output-preview">
                <div className="panel-header">
                  <h3>Output preview</h3>
                  <Button type="button" onClick={() => showPreview("preview")}>
                    <Eye size={16} />
                    View preview
                  </Button>
                </div>
                <div className="automation-output-symbols">
                  {draft.formats.map((format) => (
                    <span key={format}>
                      <FormatIcon format={format} />
                      {format}
                    </span>
                  ))}
                  {draft.destinations.map((destination) => (
                    <span key={destination}>
                      <DestinationIcon destination={destination} />
                      {destination}
                    </span>
                  ))}
                </div>
                <small>
                  {draft.attachments
                    ? "Selected file attachments"
                    : "Attachments off"}{" "}
                  ·{" "}
                  {draft.summaryInBody
                    ? "Sample summary in message"
                    : "Summary body off"}
                </small>
              </section>
              {errors.length > 0 && (
                <div className="error" role="alert">
                  {errors.map((error) => (
                    <p key={error}>{error}</p>
                  ))}
                </div>
              )}
              <div className="automation-editor-footer">
                <Button primary type="submit">
                  <Save size={16} />
                  Save automation
                </Button>
                <Button type="button" onClick={() => showPreview("test")}>
                  <Send size={16} />
                  Send test
                </Button>
                <Button type="button" onClick={() => navigate("/automations")}>
                  <ChevronLeft size={15} />
                  Back
                </Button>
              </div>
              <small>
                No real deliveries. All schedules use the fixed demo snapshot.
              </small>
            </form>
          </Panel>
        )}
      </div>
      {menu && (
        <div
          className="automation-menu"
          onKeyDown={(event) => {
            if (["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) {
              event.preventDefault();
              const buttons = Array.from(
                event.currentTarget.querySelectorAll<HTMLButtonElement>(
                  "button",
                ),
              );
              const current = buttons.indexOf(
                document.activeElement as HTMLButtonElement,
              );
              const next =
                event.key === "Home"
                  ? 0
                  : event.key === "End"
                    ? buttons.length - 1
                    : (current +
                        (event.key === "ArrowDown" ? 1 : -1) +
                        buttons.length) %
                      buttons.length;
              buttons[next]?.focus();
            }
          }}
          role="menu"
          aria-label="Automation actions"
          style={{ left: menu.left, top: menu.top }}
        >
          {(() => {
            const automation = state.automations.find(
              (item) => item.id === menu.id,
            )!;
            return (
              <>
                <button
                  role="menuitem"
                  onClick={() => {
                    setMenu(null);
                    navigate(`/automations/${automation.id}`);
                  }}
                >
                  <Settings2 size={16} />
                  Edit
                </button>
                <button
                  role="menuitem"
                  onClick={() => duplicateAutomation(automation)}
                >
                  <Copy size={16} />
                  Duplicate
                </button>
                <button
                  role="menuitem"
                  onClick={() => toggleStatus(automation)}
                >
                  {automation.status === "Active" ? (
                    <Pause size={16} />
                  ) : (
                    <Play size={16} />
                  )}{" "}
                  {automation.status === "Active" ? "Pause" : "Resume"}
                </button>
                <button
                  role="menuitem"
                  onClick={() => {
                    setDeleteId(automation.id);
                    setMenu(null);
                  }}
                >
                  <Trash2 size={16} />
                  Delete
                </button>
              </>
            );
          })()}
        </div>
      )}
      {deleteId && (
        <Modal
          title="Delete this automation?"
          onClose={() => setDeleteId(null)}
        >
          <p>
            Remove its local configuration. The linked saved report remains
            available.
          </p>
          <div className="dialog-footer">
            <Button onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button danger onClick={deleteAutomation}>
              Delete automation
            </Button>
          </div>
        </Modal>
      )}
      {preview && data && (
        <Modal
          title={
            preview === "test"
              ? "Local test result"
              : "Automation output preview"
          }
          onClose={() => setPreview(null)}
        >
          <div className="stack">
            {preview === "test" && (
              <div className="notice">
                <CheckCircle2 size={20} /> Local test prepared. No message was
                sent.
              </div>
            )}
            <h3>{draft.name}</h3>
            <p>{draft.message}</p>
            <dl className="automation-preview-details">
              <dt>Report</dt>
              <dd>{report?.name}</dd>
              <dt>Period</dt>
              <dd>{data.periodLabel}</dd>
              <dt>Next run</dt>
              <dd>
                {nextRun(draft, state.snapshot)} ({draft.timezone})
              </dd>
            </dl>
            {draft.destinations.map((destination) => (
              <p key={destination}>
                <DestinationIcon destination={destination} /> {destination}:{" "}
                {draft.recipients[destination]}
              </p>
            ))}
            {draft.summaryInBody && (
              <div className="tinted">
                <strong>Sample summary · No live model</strong>
                <p>{summaryFacts}</p>
              </div>
            )}
            {draft.cadence === "On trigger" && (
              <p>
                Trigger preview:{" "}
                {(() => {
                  const metric = selectReportData(state, {
                    ...report!,
                    metrics: ["netRevenue"],
                  }).metrics[0];
                  return metric.change === null
                    ? "No comparison baseline."
                    : Math.abs(metric.change) >= draft.threshold
                      ? "Threshold met in this sample report."
                      : "Threshold not met in this sample report.";
                })()}
              </p>
            )}
            <div className="automation-output-symbols">
              {draft.formats.map((format) => (
                <span key={format}>
                  <FormatIcon format={format} />
                  {format}
                </span>
              ))}
            </div>
            <p>
              {draft.attachments
                ? "Files are available below as local downloads."
                : "Attachments are off for the simulated message. You can still inspect the report files below."}
            </p>
            <Button onClick={() => setExportOpen(true)}>
              <Eye size={16} />
              Download selected outputs
            </Button>
          </div>
        </Modal>
      )}
      {exportOpen && data && (
        <ReportExport
          data={data}
          formats={draft.formats}
          title="Download selected outputs"
          onClose={() => setExportOpen(false)}
        />
      )}
      {guard.pending && (
        <Modal title="Discard unsaved changes?" onClose={guard.cancel}>
          <p>This automation has unsaved edits.</p>
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
