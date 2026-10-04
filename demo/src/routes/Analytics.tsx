import { useState } from "react";
import {
  ArrowRight,
  ChartNoAxesColumn,
  DollarSign,
  Download,
  RefreshCw,
  ShoppingBag,
  Sparkles,
  Users,
} from "lucide-react";
import {
  Badge,
  Button,
  Field,
  Panel,
  Select,
  Sparkline,
} from "../components/ui";
import { InsightPanel } from "../components/InsightPanel";
import { ReportChart } from "../components/ReportChart";
import { ReportExport } from "../components/ReportExport";
import { ProductArt } from "../components/ProductArt";
import { useDemo } from "../components/store";
import { navigate, useRoute } from "../components/router";
import { selectAnalytics, money, type ReportData } from "../selectors";
import type { Period, Report } from "../domain/model";
import "./analytics.css";
export default function Analytics() {
  const { state } = useDemo();
  const route = useRoute();
  const params = new URLSearchParams(route.split("?")[1]);
  const period: Period = ["7d", "30d", "90d"].includes(
    params.get("period") || "",
  )
    ? (params.get("period") as Period)
    : "30d";
  const compare = params.get("compare") !== "none";
  const [grouping, setGrouping] = useState<Report["grouping"]>("day");
  const [metric, setMetric] = useState<"subscriptionRevenue" | "orders">(
    "subscriptionRevenue",
  );
  const [insightId, setInsightId] = useState(state.insights[0].id);
  const [exportOpen, setExportOpen] = useState(false);
  const analytics = selectAnalytics(state, period, grouping);
  const data: ReportData = {
    title: "Subscription performance",
    periodLabel: analytics.periodLabel,
    snapshot: state.snapshot,
    comparisonEnabled: compare,
    metrics: analytics.metrics.filter((m) =>
      [
        "subscriptionRevenue",
        "orders",
        "refundRate",
        "retention",
        "aov",
      ].includes(m.id),
    ),
    rows: analytics.trend,
    products: analytics.products,
  };
  const insight =
    state.insights.find((i) => i.id === insightId) || state.insights[0];
  function changePeriod(value: string) {
    navigate(
      `/analytics?period=${value}&compare=${compare ? "previous" : "none"}`,
    );
  }
  return (
    <>
      <div className="analytics-controls">
        <Field label="Analytics period">
          <Select value={period} onChange={(e) => changePeriod(e.target.value)}>
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
          </Select>
        </Field>
        <Field label="Compare to">
          <Select
            value={compare ? "previous" : "none"}
            onChange={(e) =>
              navigate(`/analytics?period=${period}&compare=${e.target.value}`)
            }
          >
            <option value="previous">Previous period</option>
            <option value="none">No comparison</option>
          </Select>
        </Field>
        <Button onClick={() => setExportOpen(true)}>
          <Download size={16} /> Export overview
        </Button>
      </div>
      <div className="analytics-metrics">
        {[
          "subscriptionRevenue",
          "orders",
          "refundRate",
          "retention",
          "aov",
        ].map((id, index) => {
          const m = analytics.metrics.find((m) => m.id === id)!;
          const Icon = [
            DollarSign,
            Users,
            RefreshCw,
            ChartNoAxesColumn,
            ShoppingBag,
          ][index];
          const down = m.change !== null && m.change < 0;
          const bad = id === "refundRate" ? !down : down;
          return (
            <div className="analytics-metric" key={id}>
              <div className="metric-title">
                <span className="icon-tile">
                  <Icon size={23} />
                </span>
                {m.label}
              </div>
              <div className="analytics-value">
                <strong>{m.formatted}</strong>
                {compare && (
                  <span className={bad ? "negative" : "positive"}>
                    {m.change === null
                      ? "No baseline"
                      : `${down ? "↓" : "↑"} ${Math.abs(m.change).toFixed(1)} ${m.changeUnit}`}
                  </span>
                )}
              </div>
              <div className="metric-foot">
                <span>
                  {compare
                    ? `vs. previous ${Number.parseInt(period)} days`
                    : "Selected reporting period"}
                </span>
                <Sparkline values={analytics.trend.map((row) => row[m.id])} />
              </div>
            </div>
          );
        })}
      </div>
      <div className="analytics-main-grid">
        <Panel>
          <div className="panel-header">
            <div>
              <h2>
                {metric === "subscriptionRevenue"
                  ? "Subscription revenue"
                  : "Order volume"}
              </h2>
              <p>{analytics.periodLabel} · USD · Net of recorded refunds</p>
            </div>
            <div className="toolbar">
              <Select
                aria-label="Trend metric"
                value={metric}
                onChange={(e) => setMetric(e.target.value as typeof metric)}
              >
                <option value="subscriptionRevenue">Revenue</option>
                <option value="orders">Orders</option>
              </Select>
              <Select
                aria-label="Trend time grouping"
                value={grouping}
                onChange={(e) =>
                  setGrouping(e.target.value as Report["grouping"])
                }
              >
                <option value="day">Daily</option>
                <option value="week">Weekly</option>
                <option value="month">Monthly</option>
              </Select>
            </div>
          </div>
          <ReportChart data={data} metric={metric} />
        </Panel>
        <Panel>
          <div className="panel-header">
            <div>
              <h2>Top performing products</h2>
              <p>By net revenue · selected period</p>
            </div>
            <a
              className="button"
              href={`#/reports/product-performance?period=${period}`}
            >
              <ArrowRight size={16} /> View report
            </a>
          </div>
          <div className="product-ranking">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Product</th>
                  <th>Revenue</th>
                  <th>Units</th>
                  <th>Share</th>
                </tr>
              </thead>
              <tbody>
                {analytics.products.map((p, index) => (
                  <tr key={p.id}>
                    <td>{index + 1}</td>
                    <td>
                      <a href={`#/products/${p.id}`}>
                        <ProductArt
                          product={state.products.find(
                            (product) => product.id === p.id,
                          )!}
                          small
                        />
                        <span>{p.name}</span>
                      </a>
                    </td>
                    <td>{money(p.netRevenue)}</td>
                    <td>{p.units}</td>
                    <td>{p.share.toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>
      <section className="store-insights">
        <div className="panel-header">
          <div className="section-heading">
            <Sparkles size={30} />
            <div>
              <h2>Loom AI™ insights</h2>
              <p>
                Store-wide sample insights, separate from the selected report
                period. No live model.
              </p>
            </div>
          </div>
          <Badge>Fixed sample context</Badge>
        </div>
        <div className="store-insights-grid">
          <div className="store-insight-list">
            {state.insights.map((i) => (
              <button
                key={i.id}
                className={insight.id === i.id ? "active" : ""}
                aria-pressed={insight.id === i.id}
                onClick={() => setInsightId(i.id)}
              >
                <ChartNoAxesColumn size={21} />
                <span>
                  <strong>{i.title}</strong>
                  <small>
                    {i.category} · {i.change}
                  </small>
                </span>
                <ArrowRight size={15} />
              </button>
            ))}
          </div>
          <InsightPanel key={insight.id} insight={insight} compact />
        </div>
      </section>
      <p className="scope-note">
        Metrics and exports share the same fixtures. Rates use documented
        denominators; rate changes are percentage points. No real store
        performance is represented.
      </p>
      {exportOpen && (
        <ReportExport data={data} onClose={() => setExportOpen(false)} />
      )}
    </>
  );
}
