import {
  Sparkles,
  TrendingUp,
  ChevronRight,
  Clock,
  AlertTriangle,
} from "lucide-react";
import { Badge, Button, Empty, Panel } from "../components/ui";
import { InsightPanel } from "../components/InsightPanel";
import { useDemo } from "../components/store";
import "./insights.css";
export default function Insights({ route }: { route: string }) {
  const { state } = useDemo();
  const params = new URLSearchParams(route.split("?")[1]);
  const view = ["for-you", "todo", "saved", "completed"].includes(
    params.get("view") || "",
  )
    ? params.get("view")!
    : "for-you";
  const filtered = state.insights.filter(
    (i) =>
      view === "for-you" ||
      (view === "saved" && i.saved) ||
      (view === "todo" &&
        state.tasks.some((t) => t.insightId === i.id && t.status === "todo")) ||
      (view === "completed" &&
        state.tasks.some(
          (t) => t.insightId === i.id && t.status === "completed",
        )),
  );
  const selected =
    filtered.find((i) => i.id === params.get("insight")) || filtered[0];
  const href = (nextView: string, id?: string) =>
    `#/insights?view=${nextView}${id ? "&insight=" + id : ""}`;
  const views = [
    ["for-you", "For you", state.insights.length],
    ["todo", "To do", state.tasks.filter((t) => t.status === "todo").length],
    ["saved", "Saved", state.insights.filter((i) => i.saved).length],
    [
      "completed",
      "Completed",
      state.tasks.filter((t) => t.status === "completed").length,
    ],
  ] as const;
  return (
    <>
      <Panel className="ask-loom-panel">
        <div>
          <div className="section-heading">
            <span className="icon-tile">
              <Sparkles />
            </span>
            <div>
              <h2>Ask Loom</h2>
              <p>Sample insights · No live model</p>
            </div>
          </div>
          <div className="example-prompt">
            Choose a supported sample question to explore a fixture-grounded
            explanation.
          </div>
        </div>
        <div className="example-questions">
          <small>Example workflow — no live AI.</small>
          <a href={href("for-you", "insight-revenue")}>
            What changed in revenue?
          </a>
          <a href={href("for-you", "insight-capacity")}>
            Where should I focus in scheduling?
          </a>
        </div>
      </Panel>
      <div className="insight-workspace">
        <div className="insight-sidebar">
          <nav className="insight-view-tabs" aria-label="Insight views">
            {views.map(([id, label, count]) => (
              <a
                key={id}
                href={href(id)}
                aria-current={view === id ? "page" : undefined}
                className={view === id ? "active" : ""}
              >
                {label}
                <span>{count}</span>
              </a>
            ))}
          </nav>
          <div className="insight-list">
            {filtered.map((i) => (
              <a
                key={i.id}
                className={`insight-list-item ${selected?.id === i.id ? "active" : ""}`}
                href={href(view, i.id)}
                aria-current={selected?.id === i.id ? "true" : undefined}
              >
                <span className={`insight-symbol ${i.tone}`}>
                  {i.tone === "warning" ? (
                    <AlertTriangle size={22} />
                  ) : (
                    <TrendingUp size={22} />
                  )}
                </span>
                <span className="insight-list-copy">
                  <strong title={i.title}>{i.title}</strong>
                  <span>
                    <Badge
                      tone={
                        i.tone === "positive"
                          ? "green"
                          : i.tone === "warning"
                            ? "amber"
                            : "violet"
                      }
                    >
                      {i.change}
                    </Badge>
                    <Badge>{i.category}</Badge>
                  </span>
                </span>
                <ChevronRight size={17} />
              </a>
            ))}
          </div>
          {!filtered.length && (
            <Panel>
              <Empty
                title={`No ${view === "todo" ? "tasks" : view === "saved" ? "saved insights" : "completed tasks"} yet`}
              >
                Choose For you to explore sample insights and save a useful next
                step.
              </Empty>
            </Panel>
          )}
          <small className="insight-update">
            <Clock size={12} /> Fixed sample snapshot. Saved context stays
            available.
          </small>
        </div>
        <div className="insight-detail">
          {selected ? (
            <InsightPanel key={selected.id} insight={selected} />
          ) : (
            <Panel>
              <Empty title="Your next step starts with an insight">
                <a className="button primary" href={href("for-you")}>
                  Explore sample insights
                </a>
              </Empty>
            </Panel>
          )}
        </div>
      </div>
    </>
  );
}
