import { useEffect, useMemo, useState } from "react";
import {
  ShoppingCart,
  DollarSign,
  ChartNoAxesColumn,
  SlidersHorizontal,
  Bookmark,
  Download,
  ArrowRight,
  ArrowLeft,
  Search,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  CreditCard,
  PackageCheck,
  Settings2,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import {
  Badge,
  Button,
  Empty,
  Field,
  IconButton,
  Metric,
  Modal,
  Panel,
  Select,
} from "../components/ui";
import { useDemo } from "../components/store";
import { money, dateLabel, uid } from "../components/format";
import { navigate } from "../components/router";
import { requestFileDownload, type DownloadResult } from "../exports";
import { csvBytes } from "../exports/common";
import { canReleaseOrder } from "../domain/validation";
import {
  selectOrders,
  selectOrderContext,
  orderNet as net,
} from "../selectors";
import type { Order, OrderFilters } from "../domain/model";
const COLUMNS = [
  "Product",
  "Type",
  "Created",
  "Payment",
  "Fulfillment",
  "Release state",
];
const initialFilters: OrderFilters = {
  search: "",
  period: "30d",
  type: "all",
  payment: "all",
  fulfillment: "all",
  release: "all",
  sort: "date-desc",
};
function readFilters(route: string): OrderFilters {
  const p = new URLSearchParams(route.split("?")[1]);
  const allowed: Record<string, string[]> = {
    period: ["7d", "30d", "90d"],
    type: ["all", "Subscription", "One-time"],
    payment: ["all", "Paid", "Pending", "Failed", "Refunded"],
    fulfillment: ["all", "Unfulfilled", "Scheduled", "Fulfilled", "Cancelled"],
    release: [
      "all",
      "Needs review",
      "Ready",
      "Released",
      "Complete",
      "Blocked",
    ],
    sort: ["date-desc", "date-asc", "total-desc", "total-asc"],
  };
  return Object.fromEntries(
    Object.entries(initialFilters).map(([k, v]) => [
      k,
      k === "search"
        ? (p.get(k) || "").slice(0, 200)
        : allowed[k]?.includes(p.get(k) || "")
          ? p.get(k)
          : v,
    ]),
  ) as unknown as OrderFilters;
}
export default function Orders({ route }: { route: string }) {
  const { state, dispatch, notify } = useDemo();
  const filters = useMemo(() => readFilters(route), [route]);
  const [selected, setSelected] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [columns, setColumns] = useState(COLUMNS);
  const [dialog, setDialog] = useState<
    null | "filters" | "columns" | "save" | "export" | "confirm"
  >(null);
  const [viewName, setViewName] = useState("");
  const [error, setError] = useState("");
  const [download, setDownload] = useState<DownloadResult | null>(null);
  useEffect(() => () => download?.dispose(), [download]);
  useEffect(() => {
    if (dialog !== "export") setDownload(null);
  }, [dialog]);
  const [confirmed, setConfirmed] = useState(false);
  const suffix = route.includes("?") ? "?" + route.split("?")[1] : "";
  const orderId = route.split("?")[0].split("/")[2];
  const focused = state.orders.find((o) => o.id === orderId);
  const context = selectOrderContext(
    state,
    filters.period === "all" ? "90d" : filters.period,
  );
  const counts = context;
  const rows = selectOrders(state, filters);
  const pages = Math.max(1, Math.ceil(rows.length / pageSize));
  const currentPage = Math.min(page, pages);
  const visible = rows.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );
  const hasFilters = Object.entries(filters).some(
    ([k, v]) => v !== initialFilters[k as keyof OrderFilters],
  );
  function setFilter(patch: Partial<OrderFilters>) {
    const next = { ...filters, ...patch };
    const params = new URLSearchParams();
    Object.entries(next).forEach(([k, v]) => {
      if (v !== initialFilters[k as keyof OrderFilters]) params.set(k, v);
    });
    const value = params.toString();
    navigate("/orders" + (value ? "?" + value : ""));
    setPage(1);
    setSelected([]);
  }
  useEffect(() => {
    setConfirmed(false);
  }, [orderId]);
  useEffect(() => {
    setSelected((current) =>
      current.filter((id) => rows.some((row) => row.id === id)),
    );
  }, [state.revision, route]);
  function cell(o: Order, column: string) {
    switch (column) {
      case "Product":
        return state.products.find((p) => p.id === o.lines[0].productId)?.name;
      case "Type":
        return (
          <Badge tone={o.type === "Subscription" ? "violet" : "neutral"}>
            {o.type}
          </Badge>
        );
      case "Created":
        return <span className="nowrap">{dateLabel(o.date)}</span>;
      case "Payment":
        return (
          <Badge
            tone={
              o.payment === "Paid"
                ? "green"
                : o.payment === "Pending"
                  ? "amber"
                  : "red"
            }
          >
            {o.payment}
          </Badge>
        );
      case "Fulfillment":
        return (
          <Badge
            tone={
              o.fulfillment === "Fulfilled"
                ? "green"
                : o.fulfillment === "Cancelled"
                  ? "red"
                  : "neutral"
            }
          >
            {o.fulfillment}
          </Badge>
        );
      case "Release state":
        return (
          <Badge
            tone={
              o.release === "Needs review"
                ? "amber"
                : o.release === "Ready"
                  ? "blue"
                  : o.release === "Blocked"
                    ? "red"
                    : "green"
            }
          >
            {o.release}
          </Badge>
        );
      default:
        return null;
    }
  }
  async function exportOrders() {
    try {
      const scope = selected.length
        ? rows.filter((o) => selected.includes(o.id))
        : rows;
      const bytes = csvBytes([
        [
          "Order",
          "Product",
          "Type",
          "Date",
          "Payment",
          "Fulfillment",
          "Release",
          "Net USD",
        ],
        ...scope.map((o) => [
          o.number,
          state.products.find((p) => p.id === o.lines[0].productId)?.name || "",
          o.type,
          o.date,
          o.payment,
          o.fulfillment,
          o.release,
          (net(o) / 100).toFixed(2),
        ]),
      ]);
      setError("");
      setDownload(
        requestFileDownload({
          bytes,
          filename: "loom-sample-orders.csv",
          mimeType: "text/csv;charset=utf-8",
        }),
      );
      notify(
        `CSV download requested for ${scope.length} ${selected.length ? "selected" : "filtered"} sample orders.`,
      );
    } catch {
      setError(
        "The download could not start. Try a browser with downloads enabled.",
      );
    }
  }
  if (orderId && !focused)
    return (
      <Panel>
        <Empty title="Order not found">This sample order is unavailable.</Empty>
        <a href={"#/orders" + suffix}>Return to orders</a>
      </Panel>
    );
  if (focused)
    return (
      <>
        <a className="back-link" href={"#/orders" + suffix}>
          <ArrowLeft size={17} /> Back to orders
        </a>
        <Panel>
          <div className="panel-header">
            <div>
              <h2>Order {focused.number}</h2>
              <p>
                Synthetic order · {dateLabel(focused.date)} · {focused.type}
              </p>
            </div>
            <Badge tone={focused.release === "Blocked" ? "red" : "violet"}>
              {focused.release}
            </Badge>
          </div>
          <div className="notice">
            {focused.attention ||
              "Review the independent payment, fulfillment, and release states below."}
          </div>
          <hr />
          <div className="form-grid">
            <div>
              <h3>Fulfillment group</h3>
              <div className="order-lines">
                {focused.lines.map((l, i) => (
                  <div key={i}>
                    <span>
                      {state.products.find((p) => p.id === l.productId)?.name} ×{" "}
                      {l.quantity}
                    </span>
                    <strong>{money(l.unitPriceCents * l.quantity)}</strong>
                  </div>
                ))}
              </div>
            </div>
            <dl className="definition-list">
              <dt>Payment</dt>
              <dd>{focused.payment}</dd>
              <dt>Fulfillment</dt>
              <dd>{focused.fulfillment}</dd>
              <dt>Billing date</dt>
              <dd>{dateLabel(focused.billingDate)}</dd>
              <dt>Fulfillment date</dt>
              <dd>{dateLabel(focused.fulfillmentDate)}</dd>
              <dt>Estimated delivery</dt>
              <dd>{dateLabel(focused.deliveryDate)}</dd>
              <dt>Net order value</dt>
              <dd>{money(net(focused))}</dd>
            </dl>
          </div>
          <hr />
          {focused.release === "Blocked" ? (
            <p>
              This order is blocked. Unpaid or cancelled records cannot be
              released.
            </p>
          ) : focused.release === "Complete" ? (
            <p>
              The sample order is complete. No further fulfillment action is
              available.
            </p>
          ) : (
            <>
              <p>
                Applying this action updates only the sample order, schedule,
                and activity in this browser.
              </p>
              <div className="toolbar" style={{ marginTop: 16 }}>
                <Button
                  primary
                  disabled={
                    !canReleaseOrder(state, focused.id) &&
                    focused.release !== "Released"
                  }
                  onClick={() => setDialog("confirm")}
                >
                  {focused.release === "Released"
                    ? "Mark complete in demo"
                    : "Review and release"}
                </Button>
                <a className="button" href={"#/orders" + suffix}>
                  Return to list
                </a>
              </div>
            </>
          )}
        </Panel>
        {dialog === "confirm" && (
          <Modal
            title={
              focused.release === "Released"
                ? "Complete sample fulfillment"
                : "Confirm sample release"
            }
            onClose={() => setDialog(null)}
          >
            <p>
              {focused.number}:{" "}
              {focused.release === "Released"
                ? "mark the synthetic fulfillment complete"
                : "confirm the displayed date and release the paid fulfillment group"}
              .
            </p>
            <p>No provider or Shopify request will be made.</p>
            <label className="check-line">
              <input
                type="checkbox"
                checked={confirmed}
                onChange={(e) => setConfirmed(e.target.checked)}
              />{" "}
              I reviewed the sample fulfillment details.
            </label>
            <div className="dialog-footer">
              <Button onClick={() => setDialog(null)}>Cancel</Button>
              <Button
                primary
                disabled={!confirmed}
                onClick={() => {
                  const ok = dispatch({
                    type:
                      focused.release === "Released"
                        ? "order/complete"
                        : "order/release",
                    id: focused.id,
                  });
                  setDialog(null);
                  notify(
                    ok
                      ? "Sample order updated. Local activity recorded."
                      : "Order changed or is no longer eligible. Review its current state.",
                  );
                }}
              >
                Apply to demo
              </Button>
            </div>
          </Modal>
        )}
      </>
    );
  const sm = context.subscription,
    om = context.oneTime;
  return (
    <>
      <div className="orders-period">
        <Field label="Reporting period">
          <Select
            aria-label="Order reporting period"
            value={filters.period}
            onChange={(e) =>
              setFilter({ period: e.target.value as OrderFilters["period"] })
            }
          >
            <option value="30d">Last 30 days</option>
            <option value="7d">Last 7 days</option>
            <option value="90d">Last 90 days</option>
          </Select>
        </Field>
      </div>
      <Panel className="order-context">
        <div className="panel-header">
          <div>
            <h2>Order context</h2>
            <p>
              Selected period · USD · Billing and fulfillment are tracked
              separately.
            </p>
          </div>
          <a className="button tinted" href="#/analytics">
            <ChartNoAxesColumn size={17} /> Analyze in Loom{" "}
            <ChevronRight size={15} />
          </a>
        </div>
        <div className="metrics">
          <Metric
            icon={ShoppingCart}
            title="Subscription Orders"
            value={sm.count}
            sparkValues={sm.counts}
            detail="Across selected period"
          />
          <Metric
            icon={ShoppingCart}
            title="One-time Orders"
            value={om.count}
            sparkValues={om.counts}
            detail="Across selected period"
          />
          <Metric
            icon={DollarSign}
            title="Subscription Revenue"
            value={money(sm.revenue)}
            sparkValues={sm.revenues}
            detail="Net of recorded refunds"
          />
          <Metric
            icon={DollarSign}
            title="One-time Revenue"
            value={money(om.revenue)}
            sparkValues={om.revenues}
            detail="Net of recorded refunds"
          />
          <Metric
            icon={ChartNoAxesColumn}
            title="Subscription AOV"
            value={money(sm.aov)}
            sparkValues={sm.aovs}
            detail="Per paid/refunded order"
          />
          <Metric
            icon={ChartNoAxesColumn}
            title="One-time AOV"
            value={money(om.aov)}
            sparkValues={om.aovs}
            detail="Per paid/refunded order"
          />
        </div>
      </Panel>
      <Panel className="attention-strip">
        <button
          className="attention-item amber"
          onClick={() =>
            setFilter({
              ...initialFilters,
              period: filters.period,
              release: "Needs review",
            })
          }
        >
          <span className="attention-icon">
            <AlertCircle size={22} />
          </span>
          <span>
            <strong>{counts.review} orders need review</strong>
            <small>Require attention before fulfillment</small>
          </span>
          <ChevronRight size={17} />
        </button>
        <button
          className="attention-item"
          onClick={() =>
            setFilter({
              ...initialFilters,
              period: filters.period,
              payment: "Failed",
            })
          }
        >
          <span className="attention-icon">
            <CreditCard size={22} />
          </span>
          <span>
            <strong>{counts.pending} payments need attention</strong>
            <small>Payment must be confirmed before release</small>
          </span>
          <ChevronRight size={17} />
        </button>
        <button
          className="attention-item green"
          onClick={() =>
            setFilter({
              ...initialFilters,
              period: filters.period,
              release: "Ready",
              payment: "Paid",
            })
          }
        >
          <span className="attention-icon">
            <PackageCheck size={22} />
          </span>
          <span>
            <strong>{counts.ready} ready to release</strong>
            <small>Paid and ready for fulfillment review</small>
          </span>
          <ChevronRight size={17} />
        </button>
      </Panel>
      <Panel className="table-panel">
        <div className="panel-header">
          <div>
            <h2>All store orders</h2>
            <p>
              One row per sample order. Review fulfillment groups before
              release.
            </p>
          </div>
          <div className="toolbar">
            <Button onClick={() => setDialog("columns")}>
              <Settings2 size={16} /> Customize view
            </Button>
            <Button
              onClick={() => {
                setViewName("");
                setDialog("save");
              }}
            >
              <Bookmark size={16} /> Save view
            </Button>
            <IconButton
              icon={SlidersHorizontal}
              label="Additional order filters"
              onClick={() => setDialog("filters")}
            />
            <Button
              onClick={() => {
                setError("");
                setDialog("export");
              }}
            >
              <Download size={16} /> Export
            </Button>
          </div>
        </div>
        <div className="filter-row">
          <Field label="Search orders">
            <div className="search-field">
              <input
                className="text-input"
                placeholder="Order #, product, or sample name"
                value={filters.search}
                onChange={(e) => setFilter({ search: e.target.value })}
              />
            </div>
          </Field>
          <Field label="Order type">
            <Select
              value={filters.type}
              onChange={(e) =>
                setFilter({ type: e.target.value as OrderFilters["type"] })
              }
            >
              <option value="all">All</option>
              <option>Subscription</option>
              <option>One-time</option>
            </Select>
          </Field>
          <Field label="Payment status">
            <Select
              value={filters.payment}
              onChange={(e) =>
                setFilter({
                  payment: e.target.value as OrderFilters["payment"],
                })
              }
            >
              <option value="all">All</option>
              {["Paid", "Pending", "Failed", "Refunded"].map((s) => (
                <option key={s}>{s}</option>
              ))}
            </Select>
          </Field>
          {hasFilters && (
            <Button onClick={() => setFilter(initialFilters)}>
              Clear filters
            </Button>
          )}
          {state.savedViews.length > 0 && (
            <Field label="Saved views">
              <Select
                aria-label="Saved order view"
                value=""
                onChange={(e) => {
                  const v = state.savedViews.find(
                    (v) => v.id === e.target.value,
                  );
                  if (v) {
                    setColumns(v.columns);
                    setFilter(v.filters);
                  }
                }}
              >
                <option value="">Choose a view</option>
                {state.savedViews.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name}
                  </option>
                ))}
              </Select>
            </Field>
          )}
        </div>
        <div className="table-scroll order-desktop-table">
          <table>
            <thead>
              <tr>
                <th>
                  <input
                    aria-label="Select all orders on this page"
                    type="checkbox"
                    checked={
                      !!visible.length &&
                      visible.every((o) => selected.includes(o.id))
                    }
                    onChange={(e) =>
                      setSelected(
                        e.target.checked
                          ? [
                              ...new Set([
                                ...selected,
                                ...visible.map((o) => o.id),
                              ]),
                            ]
                          : selected.filter(
                              (id) => !visible.some((o) => o.id === id),
                            ),
                      )
                    }
                  />
                </th>
                <th>Order #</th>
                {columns.map((c) => (
                  <th key={c}>
                    {c === "Created" ? (
                      <button
                        className="sort-button"
                        onClick={() =>
                          setFilter({
                            sort:
                              filters.sort === "date-desc"
                                ? "date-asc"
                                : "date-desc",
                          })
                        }
                      >
                        Created{" "}
                        {filters.sort === "date-asc" ? (
                          <ArrowUp size={13} />
                        ) : (
                          <ArrowDown size={13} />
                        )}
                      </button>
                    ) : (
                      c
                    )}
                  </th>
                ))}
                <th>Next action</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((o) => (
                <tr key={o.id}>
                  <td>
                    <input
                      aria-label={`Select order ${o.number}`}
                      type="checkbox"
                      checked={selected.includes(o.id)}
                      onChange={(e) =>
                        setSelected(
                          e.target.checked
                            ? [...selected, o.id]
                            : selected.filter((id) => id !== o.id),
                        )
                      }
                    />
                  </td>
                  <td>
                    <a href={`#/orders/${o.id}${suffix}`}>{o.number}</a>
                  </td>
                  {columns.map((c) => (
                    <td key={c}>{cell(o, c)}</td>
                  ))}
                  <td>
                    <a
                      className="row-action"
                      href={`#/orders/${o.id}${suffix}`}
                    >
                      {o.release === "Needs review"
                        ? "Review"
                        : o.release === "Ready"
                          ? "Ready"
                          : o.release === "Complete"
                            ? "Complete"
                            : "View"}
                      <ArrowRight size={15} />
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>{" "}
        <div className="order-mobile-list">
          {visible.map((o) => (
            <article className="order-mobile-card" key={o.id}>
              <div className="card-top">
                <label className="check-line">
                  <input
                    type="checkbox"
                    aria-label={`Select sample order ${o.number}`}
                    checked={selected.includes(o.id)}
                    onChange={(e) =>
                      setSelected(
                        e.target.checked
                          ? [...selected, o.id]
                          : selected.filter((id) => id !== o.id),
                      )
                    }
                  />
                  <a href={`#/orders/${o.id}${suffix}`}>{o.number}</a>
                </label>
                <Badge tone={o.type === "Subscription" ? "violet" : "neutral"}>
                  {o.type}
                </Badge>
              </div>
              <div className="card-product">
                {
                  state.products.find((p) => p.id === o.lines[0].productId)
                    ?.name
                }
              </div>
              <div className="card-statuses">
                <div>
                  <small>Payment</small>
                  {cell(o, "Payment")}
                </div>
                <div>
                  <small>Fulfillment</small>
                  {cell(o, "Fulfillment")}
                </div>
                <div>
                  <small>Release state</small>
                  {cell(o, "Release state")}
                </div>
                <div>
                  <small>Created</small>
                  {dateLabel(o.date)}
                </div>
              </div>
              <div className="card-bottom">
                <strong>{money(net(o))}</strong>
                <a className="button" href={`#/orders/${o.id}${suffix}`}>
                  {o.release === "Needs review" ? "Review order" : "View order"}
                  <ArrowRight size={16} />
                </a>
              </div>
            </article>
          ))}
        </div>
        {!rows.length && (
          <Empty title="No matching orders">
            Try another search or clear your filters.
          </Empty>
        )}
        <div className="pagination">
          <span>
            {rows.length
              ? `${(currentPage - 1) * pageSize + 1}–${Math.min(currentPage * pageSize, rows.length)}`
              : "0"}{" "}
            of {rows.length} orders{" "}
            {selected.length > 0 && `· ${selected.length} selected`}
          </span>
          <div className="toolbar">
            <span>Rows per page</span>
            <Select
              aria-label="Rows per page"
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setPage(1);
              }}
            >
              {[5, 10, 25, 50].map((n) => (
                <option key={n}>{n}</option>
              ))}
            </Select>
            <span>
              Page {currentPage} of {pages}
            </span>
            <IconButton
              icon={ChevronLeft}
              label="Previous orders page"
              disabled={currentPage === 1}
              onClick={() => setPage(currentPage - 1)}
            />
            <IconButton
              icon={ChevronRight}
              label="Next orders page"
              disabled={currentPage === pages}
              onClick={() => setPage(currentPage + 1)}
            />
          </div>
        </div>
      </Panel>
      <p className="scope-note">
        Fixed snapshot: September 27, 2026. The summary covers the selected
        period; table filters do not change its scope.
      </p>
      {dialog === "filters" && (
        <Modal title="Additional filters" onClose={() => setDialog(null)}>
          <div className="stack">
            <Field label="Fulfillment">
              <Select
                value={filters.fulfillment}
                onChange={(e) =>
                  setFilter({
                    fulfillment: e.target.value as OrderFilters["fulfillment"],
                  })
                }
              >
                <option value="all">All</option>
                {["Unfulfilled", "Scheduled", "Fulfilled", "Cancelled"].map(
                  (v) => (
                    <option key={v}>{v}</option>
                  ),
                )}
              </Select>
            </Field>
            <Field label="Release state">
              <Select
                value={filters.release}
                onChange={(e) =>
                  setFilter({
                    release: e.target.value as OrderFilters["release"],
                  })
                }
              >
                <option value="all">All</option>
                {[
                  "Needs review",
                  "Ready",
                  "Released",
                  "Complete",
                  "Blocked",
                ].map((v) => (
                  <option key={v}>{v}</option>
                ))}
              </Select>
            </Field>
            <Field label="Sort orders">
              <Select
                value={filters.sort}
                onChange={(e) =>
                  setFilter({ sort: e.target.value as OrderFilters["sort"] })
                }
              >
                <option value="date-desc">Newest first</option>
                <option value="date-asc">Oldest first</option>
                <option value="total-desc">Highest total</option>
                <option value="total-asc">Lowest total</option>
              </Select>
            </Field>
          </div>
          <div className="dialog-footer">
            <Button primary onClick={() => setDialog(null)}>
              Done
            </Button>
          </div>
        </Modal>
      )}
      {dialog === "columns" && (
        <Modal title="Customize order view" onClose={() => setDialog(null)}>
          <p>
            Choose columns and their order. Order number and next action stay
            visible.
          </p>
          <div className="stack">
            {[...columns, ...COLUMNS.filter((c) => !columns.includes(c))].map(
              (c, i) => (
                <div className="column-option" key={c}>
                  <label className="check-line">
                    <input
                      type="checkbox"
                      checked={columns.includes(c)}
                      onChange={(e) =>
                        setColumns(
                          e.target.checked
                            ? [...columns, c]
                            : columns.filter((x) => x !== c),
                        )
                      }
                    />
                    {c}
                  </label>
                  <div className="toolbar">
                    <IconButton
                      icon={ArrowUp}
                      label={`Move ${c} left`}
                      disabled={!columns.includes(c) || i === 0}
                      onClick={() =>
                        setColumns((old) => {
                          const next = [...old];
                          [next[i - 1], next[i]] = [next[i], next[i - 1]];
                          return next;
                        })
                      }
                    />
                    <IconButton
                      icon={ArrowDown}
                      label={`Move ${c} right`}
                      disabled={
                        !columns.includes(c) || i === columns.length - 1
                      }
                      onClick={() =>
                        setColumns((old) => {
                          const next = [...old];
                          [next[i + 1], next[i]] = [next[i], next[i + 1]];
                          return next;
                        })
                      }
                    />
                  </div>
                </div>
              ),
            )}
          </div>
          <div className="dialog-footer">
            <Button primary onClick={() => setDialog(null)}>
              Done
            </Button>
          </div>
        </Modal>
      )}
      {dialog === "save" && (
        <Modal title="Save order view" onClose={() => setDialog(null)}>
          <p>Saves the current filters, sort order, and columns.</p>
          <Field label="View name">
            <input
              autoFocus
              maxLength={60}
              value={viewName}
              onChange={(e) => setViewName(e.target.value)}
            />
          </Field>
          <div className="dialog-footer">
            <Button onClick={() => setDialog(null)}>Cancel</Button>
            <Button
              primary
              disabled={!viewName.trim()}
              onClick={() => {
                if (
                  dispatch({
                    type: "view/save",
                    view: { id: uid("view"), name: viewName, filters, columns },
                  })
                ) {
                  setDialog(null);
                  notify("Named view saved locally.");
                }
              }}
            >
              Save view
            </Button>
          </div>
        </Modal>
      )}
      {dialog === "export" && (
        <Modal title="Export sample orders" onClose={() => setDialog(null)}>
          <p>
            {selected.length
              ? `${selected.length} selected orders`
              : `All ${rows.length} orders matching the current filters`}{" "}
            will be exported as CSV. Values use the same net-revenue definition
            as the overview.
          </p>
          {download && (
            <div className="notice" role="status">
              <p>{download.message}</p>
              <a href={download.url} download={download.filename}>
                Save {download.filename}
              </a>
            </div>
          )}
          {error && (
            <p role="alert" className="error">
              {error}
            </p>
          )}
          <div className="dialog-footer">
            <Button onClick={() => setDialog(null)}>
              {download ? "Done" : "Cancel"}
            </Button>
            <Button primary disabled={!rows.length} onClick={exportOrders}>
              Download CSV
            </Button>
          </div>
        </Modal>
      )}
    </>
  );
}
