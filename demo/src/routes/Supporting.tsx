import { useEffect, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  FileChartColumn,
  Mail,
  MessageSquare,
  Package,
  RefreshCcw,
  ShieldCheck,
  ShoppingCart,
} from "lucide-react";
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
import { useDemo } from "../components/store";
import { dateLabel } from "../components/format";
import { navigate, useUnsavedChanges } from "../components/router";
import { nextOccurrence } from "../domain/calendar";
import { actionErrors } from "../domain/validation";
import type { DemoAction } from "../domain/model";
import "./supporting.css";

export default function Supporting({ route = "/home" }: { route?: string }) {
  const { state, dispatch, notify, storageMessage } = useDemo();
  const path = route.split("?")[0];
  const params = new URLSearchParams(route.split("?")[1]);
  const [resetOpen, setResetOpen] = useState(false);
  const [resetAcknowledged, setResetAcknowledged] = useState(false);
  const [operation, setOperation] = useState<
    "pause" | "resume" | "skip" | null
  >(null);
  const [reasonDraft, setReasonDraft] = useState<string | null>(null);
  const cancellation = path.startsWith("/cancellations");
  const id = path.split("/")[2];
  const subscription = state.subscriptions.find((item) => item.id === id);
  const guard = useUnsavedChanges(
    !!cancellation &&
      !!subscription &&
      reasonDraft !== null &&
      reasonDraft !== (subscription.cancellationReason ?? "Uncategorized"),
  );
  const base = cancellation ? "/cancellations" : "/subscriptions";
  const query = params.get("q") || "";
  const status = params.get("status") || "all";
  const category = params.get("category") || "all";
  const page = Math.max(1, Number(params.get("page")) || 1);
  const suffix = params.toString() ? `?${params}` : "";
  useEffect(() => {
    setReasonDraft(null);
    setOperation(null);
  }, [id]);
  function filters(patch: Record<string, string>) {
    const next = new URLSearchParams(params);
    for (const [key, value] of Object.entries(patch)) {
      if (!value || value === "all") next.delete(key);
      else next.set(key, value);
    }
    if (!("page" in patch)) next.delete("page");
    navigate(`${base}${next.size ? `?${next}` : ""}`);
  }
  function localChange(action: DemoAction, message: string) {
    if (dispatch(action)) notify(message);
  }
  if (path === "/home")
    return (
      <div className="supporting-route">
        <Panel className="home-intro">
          <span className="icon-tile">
            <ShoppingCart size={23} />
          </span>
          <div>
            <h2>A sample store, ready to explore</h2>
            <p>
              Try a merchant workflow in this independently built public demo.
              Changes stay in this browser.
            </p>
          </div>
        </Panel>
        <div className="home-shortcuts">
          {[
            {
              title: "Review an order",
              text: "See why an order needs attention and apply a local fulfillment action.",
              href: "#/orders?release=Needs+review",
              icon: ShoppingCart,
            },
            {
              title: "Configure purchase options",
              text: "Edit a subscription offer and preview the sample storefront.",
              href: "#/products/daily-greens",
              icon: Package,
            },
            {
              title: "Build a useful report",
              text: "Explore connected sample data and download a real report file.",
              href: "#/reports",
              icon: FileChartColumn,
            },
          ].map(({ title, text, href, icon: Icon }) => (
            <a key={href} className="panel home-shortcut" href={href}>
              <span className="icon-tile">
                <Icon size={24} />
              </span>
              <h3>{title}</h3>
              <p>{text}</p>
              <span className="shortcut-action">
                Open workflow <ArrowRight size={17} />
              </span>
            </a>
          ))}
        </div>
        <Panel>
          <h3>Two fixed scenarios</h3>
          <p className="support-copy">
            Analytics is anchored to September 27, 2026. Scheduling explores
            December 2026. You can return to the sample starting state in
            Settings.
          </p>
          <p>
            The private Loom product, approved future-state visual references,
            and this original browser demo have separate capability boundaries.
          </p>
        </Panel>
      </div>
    );
  if (path === "/integrations")
    return (
      <div className="supporting-route">
        <Panel>
          <div className="section-heading">
            <span className="icon-tile">
              <ShieldCheck />
            </span>
            <div>
              <h2>Simulated providers, zero connections</h2>
              <p>No credentials, store access, or permissions are requested.</p>
            </div>
          </div>
          <p>
            Provider names identify the type of destination shown in the
            workflow. This demonstration does not authenticate with, send data
            to, or receive data from these services.
          </p>
        </Panel>
        <div className="integration-grid">
          {[
            {
              name: "Shopify",
              description:
                "Sample catalog, orders, and subscriptions are bundled locally.",
              icon: ShoppingCart,
            },
            {
              name: "Email",
              description:
                "Test deliveries create local files using .example recipients.",
              icon: Mail,
            },
            {
              name: "Microsoft Teams",
              description:
                "Save a sample team destination in an automation configuration.",
              icon: MessageSquare,
            },
            {
              name: "Slack",
              description:
                "Configure a sample channel such as #sample-operations.",
              icon: MessageSquare,
            },
            {
              name: "Text messages",
              description:
                "Sample destination settings only. No SMS or notification permission.",
              icon: MessageSquare,
            },
            {
              name: "Loom AI",
              description:
                "Curated sample explanations and explicit example presets. No live model.",
              icon: FileChartColumn,
            },
          ].map(({ name, description, icon: Icon }) => (
            <Panel key={name} className="integration-card">
              <div className="section-heading">
                <span className="icon-tile">
                  <Icon size={22} />
                </span>
                <h3>{name}</h3>
              </div>
              <Badge>Simulation only</Badge>
              <p>{description}</p>
              <Button
                disabled
                aria-label={`${name} live connection unavailable in this demo`}
              >
                Live connection unavailable
              </Button>
            </Panel>
          ))}
        </div>
        <a className="button" href="#/automations">
          Configure a local automation <ArrowRight size={17} />
        </a>
      </div>
    );
  if (path === "/settings")
    return (
      <div className="supporting-route settings-layout">
        <div>
          <Panel>
            <div className="panel-header">
              <div>
                <h2>Workspace preferences</h2>
                <p>Preferences apply immediately to this browser's demo.</p>
              </div>
            </div>
            <div className="stack">
              <Field
                label="Display time zone"
                hint="Calendar dates stay date-only. Automation schedules keep their own explicit time zone."
              >
                <Select
                  value={state.timezone}
                  onChange={(e) =>
                    localChange(
                      {
                        type: "preferences/update",
                        preferences: {},
                        timezone: e.target.value,
                      },
                      "Demo time zone updated locally.",
                    )
                  }
                >
                  <option value="America/New_York">
                    Eastern time — America/New_York
                  </option>
                  <option value="America/Los_Angeles">
                    Pacific time — America/Los_Angeles
                  </option>
                  <option value="Europe/London">London — Europe/London</option>
                  <option value="UTC">UTC</option>
                </Select>
              </Field>
              <label className="check-line">
                <input
                  type="checkbox"
                  checked={state.preferences.compactRows}
                  onChange={(e) =>
                    localChange(
                      {
                        type: "preferences/update",
                        preferences: { compactRows: e.target.checked },
                      },
                      "Table density preference updated.",
                    )
                  }
                />
                Compact desktop table rows
              </label>
              <label className="check-line">
                <input
                  type="checkbox"
                  checked={state.preferences.reducedMotion}
                  onChange={(e) =>
                    localChange(
                      {
                        type: "preferences/update",
                        preferences: { reducedMotion: e.target.checked },
                      },
                      "Motion preference updated.",
                    )
                  }
                />
                Reduce interface motion
              </label>
            </div>
          </Panel>
          <Panel>
            <h2>Browser-local state</h2>
            <p className="support-copy">
              {storageMessage ||
                "Changes are saved only in this browser when storage is available. No account is needed."}
            </p>
            <p>
              Reset restores the bundled synthetic records, reports, automation
              configurations, tasks, and saved views. It touches only this Loom
              demo's storage key.
            </p>
            <Button
              danger
              className="support-spaced"
              onClick={() => {
                setResetAcknowledged(false);
                setResetOpen(true);
              }}
            >
              <RefreshCcw size={16} />
              Reset demo data
            </Button>
          </Panel>
          <Panel>
            <h2>Local activity</h2>
            <p>Recent actions use the fixed demo snapshot, in action order.</p>
            {state.activity.length ? (
              <ol className="local-activity">
                {state.activity.slice(0, 10).map((event) => (
                  <li key={event.id}>
                    <span>{event.message}</span>
                    <small>{dateLabel(event.date)}</small>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="support-copy">
                No local actions yet. Try an order review or save a report.
              </p>
            )}
          </Panel>
        </div>
        <Panel>
          <h2>About this demonstration</h2>
          <dl className="about-definition">
            <dt>Data</dt>
            <dd>Entirely synthetic</dd>
            <dt>Reporting snapshot</dt>
            <dd>September 27, 2026</dd>
            <dt>Scheduling scenario</dt>
            <dd>December 2026</dd>
            <dt>Persistence schema</dt>
            <dd>Version {state.schemaVersion}</dd>
            <dt>Currency</dt>
            <dd>USD, stored as integer cents</dd>
          </dl>
          <hr />
          <p>
            This independently authored demo is a public technical case study.
            It is not an authenticated Shopify app or a deployment of the
            private Loom application.
          </p>
          <p className="support-copy">
            Automations and reminders do not execute while the browser is
            closed. Test actions prepare local sample artifacts; they never send
            a message.
          </p>
          <a className="button" href="#/home">
            Explore sample workflows
          </a>
        </Panel>
        {resetOpen && (
          <Modal
            title="Reset this Loom demo?"
            onClose={() => setResetOpen(false)}
          >
            <p>
              Your local demo edits will be replaced by the original sample
              data. This cannot be undone. Other websites and GitHub Pages
              projects are unaffected.
            </p>
            <label className="check-line">
              <input
                type="checkbox"
                checked={resetAcknowledged}
                onChange={(e) => setResetAcknowledged(e.target.checked)}
              />
              I understand my demo edits will be removed.
            </label>
            <div className="dialog-footer">
              <Button onClick={() => setResetOpen(false)}>Cancel</Button>
              <Button
                danger
                disabled={!resetAcknowledged}
                onClick={() => {
                  if (dispatch({ type: "state/reset" })) {
                    setResetOpen(false);
                    notify(
                      "Loom sample data reset in this tab. Other site data was left untouched.",
                    );
                  }
                }}
              >
                Confirm reset
              </Button>
            </div>
          </Modal>
        )}
      </div>
    );
  if (!path.startsWith("/subscriptions") && !path.startsWith("/cancellations"))
    return (
      <Panel>
        <Empty title="Page not found">
          Choose a workspace destination from the navigation.
        </Empty>
        <a className="button" href="#/orders">
          Return to orders
        </a>
      </Panel>
    );
  if (
    id &&
    (!subscription || (cancellation && subscription.status !== "Cancelled"))
  )
    return (
      <Panel>
        <Empty title="Sample contract not found">
          This contract is not available in the selected view.
        </Empty>
        <a className="button" href={`#${base}${suffix}`}>
          Return to list
        </a>
      </Panel>
    );
  if (subscription && id) {
    const product = state.products.find(
      (item) => item.id === subscription.productId,
    )!;
    const reason =
      reasonDraft ?? subscription.cancellationReason ?? "Uncategorized";
    const reasonChanged =
      reason !== (subscription.cancellationReason ?? "Uncategorized");
    const back = () => navigate(`${base}${suffix}`);
    return (
      <div className="supporting-route">
        <Button className="link support-back" onClick={back}>
          <ArrowLeft size={16} />
          Back to {cancellation ? "cancellations" : "subscriptions"}
        </Button>
        <Panel>
          <div className="panel-header">
            <div>
              <h2>{subscription.id.toUpperCase()}</h2>
              <p>{subscription.customer} · Synthetic contract</p>
            </div>
            <Badge
              tone={
                subscription.status === "Active"
                  ? "green"
                  : subscription.status === "Paused"
                    ? "amber"
                    : "red"
              }
            >
              {subscription.status}
            </Badge>
          </div>
          <div className="support-detail-grid">
            <div>
              <h3>{product.name}</h3>
              <p className="support-copy">
                A sample replenishment contract linked to the public demo
                catalog.
              </p>
              <a href={`#/products/${product.id}`}>
                View purchase options <ArrowRight size={14} />
              </a>
            </div>
            <dl className="definition-list">
              <dt>Frequency</dt>
              <dd>
                {subscription.frequency === "Monthly"
                  ? "Every calendar month"
                  : `Every ${subscription.frequency}`}
              </dd>
              <dt>Next occurrence</dt>
              <dd>
                {subscription.status === "Cancelled"
                  ? "None — cancelled"
                  : dateLabel(subscription.nextDate)}
              </dd>
              <dt>Started</dt>
              <dd>{dateLabel(subscription.startedDate)}</dd>
              <dt>Linked sample orders</dt>
              <dd>
                {
                  state.orders.filter(
                    (order) => order.subscriptionId === subscription.id,
                  ).length
                }
              </dd>
            </dl>
          </div>
          <hr />
          {cancellation ? (
            <>
              <h3>Cancellation category</h3>
              <p className="support-copy">
                Categorize an already-cancelled sample contract. This does not
                restart billing or claim a retention outcome.
              </p>
              <Field label="Cancellation reason">
                <Select
                  value={reason}
                  onChange={(e) => setReasonDraft(e.target.value)}
                >
                  {[
                    "Uncategorized",
                    "Too much product",
                    "Price",
                    "No longer needed",
                    "Delivery frequency",
                    "Other",
                  ].map((value) => (
                    <option key={value}>{value}</option>
                  ))}
                </Select>
              </Field>
              <div className="toolbar support-spaced">
                <Button
                  primary
                  disabled={!reasonChanged}
                  onClick={() => {
                    if (dispatch({ type: "subscription/reason", id, reason })) {
                      setReasonDraft(null);
                      notify("Cancellation category saved locally.");
                    }
                  }}
                >
                  Save category
                </Button>
                <Button onClick={back}>Back to cancellations</Button>
              </div>
            </>
          ) : subscription.status === "Cancelled" ? (
            <>
              <p>This sample contract is cancelled and cannot be resumed.</p>
              <a
                className="button support-spaced"
                href={`#/cancellations/${subscription.id}`}
              >
                Review cancellation category
              </a>
            </>
          ) : (
            <>
              <p>
                Actions are local simulations. Billing providers and shipment
                services are never contacted.
              </p>
              <div className="toolbar support-spaced">
                <Button
                  primary
                  onClick={() =>
                    setOperation(
                      subscription.status === "Paused" ? "resume" : "pause",
                    )
                  }
                >
                  {subscription.status === "Paused"
                    ? "Resume in demo"
                    : "Pause in demo"}
                </Button>
                <Button
                  disabled={subscription.status !== "Active"}
                  onClick={() => setOperation("skip")}
                >
                  <CalendarDays size={16} />
                  Skip next occurrence
                </Button>
                <a className="button" href="#/scheduling">
                  View scheduling
                </a>
              </div>
            </>
          )}
        </Panel>
        {operation && (
          <Modal
            title={`${operation === "pause" ? "Pause" : operation === "resume" ? "Resume" : "Skip"} sample subscription`}
            onClose={() => setOperation(null)}
          >
            <p>
              {subscription.id.toUpperCase()} · {product.name}
            </p>
            <p>
              {operation === "skip"
                ? `The next occurrence moves from ${dateLabel(subscription.nextDate)} to ${dateLabel(nextOccurrence(subscription.nextDate, subscription.frequency))}. Linked scheduled orders on the skipped occurrence move with it.`
                : operation === "pause"
                  ? "The contract will be paused locally. Existing sample orders remain available for review."
                  : "The sample contract returns to Active. Its next occurrence stays as shown."}
            </p>
            <div className="dialog-footer">
              <Button onClick={() => setOperation(null)}>Cancel</Button>
              <Button
                primary
                onClick={() => {
                  const action: DemoAction =
                    operation === "skip"
                      ? { type: "subscription/skip", id }
                      : {
                          type: "subscription/status",
                          id,
                          status: operation === "pause" ? "Paused" : "Active",
                        };
                  const errors = actionErrors(state, action);
                  if (errors.length) {
                    notify(errors.join(" "));
                    return;
                  }
                  const changed = dispatch(action);
                  setOperation(null);
                  if (changed)
                    notify(
                      "Sample subscription updated. Local activity recorded.",
                    );
                }}
              >
                Apply to demo
              </Button>
            </div>
          </Modal>
        )}
        {guard.pending && (
          <Modal
            title="Discard unsaved category change?"
            onClose={guard.cancel}
          >
            <p>The cancellation category has not been saved.</p>
            <div className="dialog-footer">
              <Button onClick={guard.cancel}>Keep editing</Button>
              <Button
                danger
                onClick={() => {
                  setReasonDraft(null);
                  guard.discard();
                }}
              >
                Discard and leave
              </Button>
            </div>
          </Modal>
        )}
      </div>
    );
  }
  const subscriptions = state.subscriptions.filter(
    (item) =>
      (!cancellation || item.status === "Cancelled") &&
      (status === "all" || item.status === status) &&
      (category === "all" || item.cancellationReason === category) &&
      `${item.id} ${item.customer} ${state.products.find((p) => p.id === item.productId)?.name}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  const pages = Math.max(1, Math.ceil(subscriptions.length / 10));
  const current = Math.min(page, pages);
  const visible = subscriptions.slice((current - 1) * 10, current * 10);
  return (
    <div className="supporting-route">
      <Panel>
        <div className="panel-header">
          <div>
            <h2>{cancellation ? "Cancellations" : "Subscriptions"}</h2>
            <p>
              {cancellation
                ? "Categorize cancelled sample contracts and retain the local context."
                : "Review cadence, next occurrence, and contract state across the sample store."}
            </p>
          </div>
          <Badge tone="violet">{subscriptions.length} sample contracts</Badge>
        </div>
        <div className="filter-row support-filters">
          <Field
            label={
              cancellation
                ? "Search cancelled contracts"
                : "Search subscriptions"
            }
          >
            <input
              placeholder="Contract, product, or sample name"
              value={query}
              onChange={(e) => filters({ q: e.target.value })}
            />
          </Field>
          {cancellation ? (
            <Field label="Cancellation category">
              <Select
                value={category}
                onChange={(e) => filters({ category: e.target.value })}
              >
                <option value="all">All categories</option>
                {[
                  "Uncategorized",
                  "Too much product",
                  "Price",
                  "No longer needed",
                  "Delivery frequency",
                  "Other",
                ].map((value) => (
                  <option key={value}>{value}</option>
                ))}
              </Select>
            </Field>
          ) : (
            <Field label="Subscription status">
              <Select
                value={status}
                onChange={(e) => filters({ status: e.target.value })}
              >
                <option value="all">All statuses</option>
                <option>Active</option>
                <option>Paused</option>
                <option>Cancelled</option>
              </Select>
            </Field>
          )}
          {(query || status !== "all" || category !== "all") && (
            <Button onClick={() => navigate(base)}>Clear filters</Button>
          )}
        </div>
        <div className="support-table">
          <table>
            <thead>
              <tr>
                <th>Contract</th>
                <th>Product</th>
                <th>Status</th>
                <th>{cancellation ? "Cancellation category" : "Frequency"}</th>
                <th>{cancellation ? "Cancelled" : "Next occurrence"}</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((item) => (
                <tr key={item.id}>
                  <td>
                    <a href={`#${base}/${item.id}${suffix}`}>
                      {item.id.toUpperCase()}
                    </a>
                    <small className="support-customer">{item.customer}</small>
                  </td>
                  <td>
                    {state.products.find((p) => p.id === item.productId)?.name}
                  </td>
                  <td>
                    <Badge
                      tone={
                        item.status === "Active"
                          ? "green"
                          : item.status === "Paused"
                            ? "amber"
                            : "red"
                      }
                    >
                      {item.status}
                    </Badge>
                  </td>
                  <td>
                    {cancellation ? item.cancellationReason : item.frequency}
                  </td>
                  <td>
                    {cancellation
                      ? item.cancelledDate
                        ? dateLabel(item.cancelledDate)
                        : "At snapshot"
                      : item.status === "Cancelled"
                        ? "None"
                        : dateLabel(item.nextDate)}
                  </td>
                  <td>
                    <a className="button" href={`#${base}/${item.id}${suffix}`}>
                      {cancellation ? "Categorize" : "View"}
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="support-cards">
          {visible.map((item) => (
            <article key={item.id}>
              <div className="toolbar">
                <strong>{item.id.toUpperCase()}</strong>
                <Badge
                  tone={
                    item.status === "Active"
                      ? "green"
                      : item.status === "Paused"
                        ? "amber"
                        : "red"
                  }
                >
                  {item.status}
                </Badge>
              </div>
              <h3>
                {state.products.find((p) => p.id === item.productId)?.name}
              </h3>
              <p>
                {cancellation
                  ? `Category: ${item.cancellationReason}`
                  : `${item.frequency} · Next: ${item.status === "Cancelled" ? "None" : dateLabel(item.nextDate)}`}
              </p>
              <a className="button" href={`#${base}/${item.id}${suffix}`}>
                {cancellation ? "Categorize cancellation" : "View subscription"}
                <ArrowRight size={16} />
              </a>
            </article>
          ))}
        </div>
        {!subscriptions.length && (
          <Empty title="No matching sample contracts">
            Try another search or clear your filters.
          </Empty>
        )}
        <div className="pagination">
          <span>
            {subscriptions.length
              ? `${(current - 1) * 10 + 1}–${Math.min(current * 10, subscriptions.length)}`
              : "0"}{" "}
            of {subscriptions.length} contracts
          </span>
          <div className="toolbar">
            <span>
              Page {current} of {pages}
            </span>
            <IconButton
              icon={ChevronLeft}
              label="Previous contracts page"
              disabled={current === 1}
              onClick={() => filters({ page: String(current - 1) })}
            />
            <IconButton
              icon={ChevronRight}
              label="Next contracts page"
              disabled={current === pages}
              onClick={() => filters({ page: String(current + 1) })}
            />
          </div>
        </div>
      </Panel>
      <p className="scope-note">
        48 historical contracts and 126 December-scenario contracts share the
        same catalog. Future contracts are excluded from September reporting.
      </p>
    </div>
  );
}
