import { useState } from "react";
import {
  ArrowRight,
  Bookmark,
  Check,
  Clock,
  FileText,
  Lightbulb,
  MessageSquare,
  Plus,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { Badge, Button, Field, Modal, Panel, Select } from "./ui";
import { useDemo } from "./store";
import { dateLabel } from "./format";
import { selectAnalytics, selectScheduleExceptions } from "../selectors";
import { isISODate } from "../domain/calendar";
import type { Insight } from "../domain/model";
import "../routes/insights.css";
export function InsightPanel({
  insight,
  compact = false,
}: {
  insight: Insight;
  compact?: boolean;
}) {
  const { state, dispatch, notify } = useDemo();
  const [tab, setTab] = useState("Insight");
  const [dialog, setDialog] = useState<"followup" | "reminder" | null>(null);
  const [question, setQuestion] = useState(0);
  const [date, setDate] = useState("2026-09-30");
  const task = state.tasks.find((t) => t.insightId === insight.id);
  const report = state.reports.find((r) => r.id === insight.reportId);
  const analytics = selectAnalytics(state);
  const metric = analytics.metrics.find(
    (m) =>
      m.id ===
      (insight.category === "Subscriptions"
        ? "retention"
        : insight.category === "Products"
          ? "aov"
          : "netRevenue"),
  )!;
  const previous = analytics.previous[metric.id];
  const format = (n: number) =>
    metric.id === "retention"
      ? n.toFixed(1) + "%"
      : new Intl.NumberFormat("en-US", {
          style: "currency",
          currency: "USD",
        }).format(n / 100);
  const operation = insight.category === "Operations";
  function complete() {
    if (!task) dispatch({ type: "task/add", insightId: insight.id });
    if (
      dispatch({
        type: "task/status",
        insightId: insight.id,
        status: "completed",
      })
    )
      notify("Task completed locally. The sample metric is unchanged.", {
        label: "Undo",
        run: () => {
          if (
            dispatch({
              type: "task/status",
              insightId: insight.id,
              status: "todo",
            })
          )
            notify("Completion undone. Task returned to To do.");
        },
      });
  }
  return (
    <Panel className={`insight-analysis ${compact ? "compact" : ""}`}>
      <div className="insight-panel-heading">
        <span className="icon-tile">
          <Sparkles size={25} />
        </span>
        <div>
          <h3>Loom AI™ analysis</h3>
          <p>Sample explanation · No live model</p>
        </div>
        <small>Snapshot Sep 27, 2026</small>
      </div>
      <div className="panel-header">
        <div>
          <h2>{insight.title}</h2>
          <p>
            {operation
              ? "December 2026 scheduling scenario"
              : "Aug 29–Sep 27, 2026 · Compared with the prior 30 days"}
          </p>
        </div>
        <Badge
          tone={
            insight.tone === "warning"
              ? "amber"
              : insight.tone === "positive"
                ? "green"
                : "violet"
          }
        >
          {insight.category}
        </Badge>
      </div>
      {!compact && (
        <div className="insight-metrics">
          {operation ? (
            <>
              <div>
                <small>Unresolved actions</small>
                <strong>{selectScheduleExceptions(state).length}</strong>
                <small>Current scheduling rules</small>
              </div>
              <div>
                <small>Daily capacity</small>
                <strong>{state.scheduleRules.capacity}</strong>
                <small>Scheduled fulfillments</small>
              </div>
              <div>
                <small>Blackout dates</small>
                <strong>{state.scheduleRules.blackoutDates.length}</strong>
                <small>In the fixed scenario</small>
              </div>
            </>
          ) : (
            <>
              <div>
                <small>{metric.label}</small>
                <strong>{metric.formatted}</strong>
                <small>Current 30-day scope</small>
              </div>
              <div>
                <small>Previous period</small>
                <strong>{format(previous)}</strong>
                <small>Same metric definition</small>
              </div>
              <div>
                <small>Change</small>
                <strong>
                  {metric.change === null
                    ? "No baseline"
                    : `${metric.change >= 0 ? "+" : ""}${metric.change.toFixed(1)} ${metric.changeUnit}`}
                </strong>
                <small>
                  {metric.changeUnit === "pp"
                    ? "Percentage-point difference"
                    : "Relative percentage change"}
                </small>
              </div>
            </>
          )}
        </div>
      )}
      <div className="analysis-tabs" aria-label="Analysis detail">
        {["Insight", "Next steps", "Supporting data"].map((t) => (
          <button
            key={t}
            aria-pressed={tab === t}
            className={tab === t ? "active" : ""}
            onClick={() => setTab(t)}
          >
            {t}
          </button>
        ))}
      </div>
      {tab === "Insight" ? (
        <>
          <p className="insight-summary">{insight.summary}</p>
          <div className="tinted insight-facts">
            <TrendingUp size={20} />
            <div>
              <h4>Signals to investigate</h4>
              <ul>
                {insight.facts.map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
            </div>
          </div>
          <div className="insight-next">
            <Lightbulb size={22} />
            <div>
              <h4>Recommended next step</h4>
              <p>{insight.recommendation}</p>
            </div>
          </div>
        </>
      ) : tab === "Next steps" ? (
        <div className="insight-next">
          <Lightbulb />
          <div>
            <h4>A useful next investigation</h4>
            <p>{insight.recommendation}</p>
            <p>
              Record a local task below. Completing it does not claim that an
              underlying business metric improved.
            </p>
          </div>
        </div>
      ) : (
        <div className="insight-data">
          <h3>Supporting definitions and scope</h3>
          <ul>
            {insight.facts.map((f) => (
              <li key={f}>{f}</li>
            ))}
          </ul>
          <p>
            These are synthetic observations and predetermined explanations. No
            campaign attribution, causal inference, or live model is available.
          </p>
          <a
            className="button"
            href={operation ? "#/scheduling" : `#/reports/${insight.reportId}`}
          >
            Open supporting {operation ? "schedule" : "report"}{" "}
            <ArrowRight size={16} />
          </a>
        </div>
      )}
      <div className="insight-actions">
        <Button
          primary
          disabled={!!task}
          onClick={() => {
            if (dispatch({ type: "task/add", insightId: insight.id }))
              notify("One local task added to To do.");
          }}
        >
          <Plus size={16} />
          {task ? "Task added" : "Add to to-do"}
        </Button>
        <Button
          onClick={() => {
            setQuestion(0);
            setDialog("followup");
          }}
        >
          <MessageSquare size={16} /> Ask a follow-up
        </Button>
        <Button
          aria-pressed={insight.saved}
          onClick={() => {
            if (
              dispatch({
                type: "insight/save",
                id: insight.id,
                saved: !insight.saved,
              })
            )
              notify(
                insight.saved
                  ? "Insight removed from Saved."
                  : "Sample insight saved.",
              );
          }}
        >
          <Bookmark size={16} />
          {insight.saved ? "Saved insight" : "Save insight"}
        </Button>
        <Button
          onClick={() => {
            setDate(task?.reminderDate || "2026-09-30");
            setDialog("reminder");
          }}
        >
          <Clock size={16} />
          {task?.reminderDate ? "Edit reminder" : "Remind me"}
        </Button>
        <Button
          className="complete-button"
          disabled={task?.status === "completed"}
          onClick={complete}
        >
          <Check size={16} />
          {task?.status === "completed" ? "Completed" : "Mark completed"}
        </Button>
      </div>
      {task?.reminderDate && (
        <p className="scope-note">
          Local reminder: {dateLabel(task.reminderDate)} · Does not run while
          the browser is closed.
        </p>
      )}
      {task && (
        <details className="task-original-context">
          <summary>Original task context</summary>
          <p style={{ whiteSpace: "pre-line" }}>{task.context}</p>
        </details>
      )}
      {task?.status === "completed" && (
        <p className="scope-note">
          Completed task context is retained.{" "}
          <Button
            className="link"
            onClick={() => {
              if (
                dispatch({
                  type: "task/status",
                  insightId: insight.id,
                  status: "todo",
                })
              )
                notify("Task returned to To do.");
            }}
          >
            Undo completion
          </Button>
        </p>
      )}
      {!compact && (
        <div className="supporting-report">
          <small>Supporting report</small>
          <a href={`#/reports/${insight.reportId}`}>
            <FileText size={20} />
            <span>
              <strong>{report?.name || "Supporting report"}</strong>
              <small>
                Saved report ·{" "}
                {
                  state.automations.filter(
                    (a) => a.reportId === insight.reportId,
                  ).length
                }{" "}
                local automations
              </small>
            </span>
            <ArrowRight size={18} />
          </a>
        </div>
      )}
      {dialog === "followup" && (
        <Modal
          title="Sample follow-up explanations"
          onClose={() => setDialog(null)}
        >
          <p>
            Choose a supported question. These answers are fixed explanations
            grounded in the sample fixtures.
          </p>
          <Field label="Example question">
            <Select
              value={question}
              onChange={(e) => setQuestion(Number(e.target.value))}
            >
              {insight.questions.map((q, i) => (
                <option key={q.question} value={i}>
                  {q.question}
                </option>
              ))}
            </Select>
          </Field>
          <div className="tinted" style={{ marginTop: 18 }}>
            <h3>{insight.questions[question].question}</h3>
            <p style={{ marginTop: 12 }}>
              {insight.questions[question].answer}
            </p>
          </div>
          <div className="dialog-footer">
            <Button onClick={() => setDialog(null)}>Close</Button>
            <a
              className="button primary"
              href={`#/reports/${insight.reportId}`}
            >
              Open supporting report
            </a>
          </div>
        </Modal>
      )}
      {dialog === "reminder" && (
        <Modal title="Local reminder" onClose={() => setDialog(null)}>
          <p>
            Choose a date in the fixed sample timeline. This creates a local
            task reminder; no notification is sent and nothing runs while the
            browser is closed.
          </p>
          <Field label="Reminder date">
            <input
              type="date"
              min="2026-09-27"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </Field>
          {(!isISODate(date) || date < "2026-09-27") && (
            <p className="error">Choose September 27, 2026 or later.</p>
          )}
          <div className="dialog-footer">
            {task?.reminderDate && (
              <Button
                onClick={() => {
                  if (
                    dispatch({
                      type: "task/reminder",
                      insightId: insight.id,
                      date: null,
                    })
                  ) {
                    setDialog(null);
                    notify("Local reminder removed.");
                  }
                }}
              >
                Remove reminder
              </Button>
            )}
            <Button onClick={() => setDialog(null)}>Cancel</Button>
            <Button
              primary
              disabled={!isISODate(date) || date < "2026-09-27"}
              onClick={() => {
                if (date === task?.reminderDate) {
                  setDialog(null);
                  notify("This local reminder is already set for that date.");
                  return;
                }
                if (
                  dispatch({
                    type: "task/reminder",
                    insightId: insight.id,
                    date,
                  })
                ) {
                  setDialog(null);
                  notify("Reminder recorded locally. Nothing will be sent.");
                }
              }}
            >
              Save reminder
            </Button>
          </div>
        </Modal>
      )}
    </Panel>
  );
}
