import { useEffect, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  Ban,
  CalendarDays,
  ChartNoAxesColumn,
  ChevronLeft,
  ChevronRight,
  List,
  Play,
  SlidersHorizontal,
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
import { navigate, useRoute, useUnsavedChanges } from "../components/router";
import { addDays, addMonths, isISODate, monthCells } from "../domain/calendar";
import {
  validateScheduleProposal,
  validateScheduleRules,
} from "../domain/validation";
import { selectScheduleDays, selectScheduleExceptions } from "../selectors";
import type { ScheduleRules } from "../domain/model";
import "./scheduling.css";

const monthLabel = (month: string) =>
  new Date(`${month}-01T12:00:00Z`).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
export default function Scheduling() {
  const { state, dispatch, notify } = useDemo();
  const route = useRoute();
  const requestedMonth =
    new URLSearchParams(route.split("?")[1]).get("month") || "2026-12";
  const month = isISODate(`${requestedMonth}-01`) ? requestedMonth : "2026-12";
  const days = selectScheduleDays(state, month);
  const allExceptions = selectScheduleExceptions(state);
  const [query, setQuery] = useState("");
  const [issue, setIssue] = useState("all");
  const [selected, setSelected] = useState<string[]>([]);
  const [dialog, setDialog] = useState<"rules" | "reschedule" | "day" | null>(
    null,
  );
  const [day, setDay] = useState("");
  const [rules, setRules] = useState<ScheduleRules>(state.scheduleRules);
  const [blackout, setBlackout] = useState("2026-12-24");
  const [discard, setDiscard] = useState(false);
  const [moveIds, setMoveIds] = useState<string[]>([]);
  const [targetDate, setTargetDate] = useState("2026-12-29");
  const [errors, setErrors] = useState<string[]>([]);
  const [mobileCalendar, setMobileCalendar] = useState(false);
  const exceptions = allExceptions.filter(
    (order) =>
      (issue === "all" || order.reason === issue) &&
      `${order.number} ${order.customer} ${state.products.find((product) => product.id === order.lines[0].productId)?.name}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  const peak = [...days].sort((a, b) => b.count - a.count)[0];
  const over = days.filter((d) => d.status === "over-capacity");
  const blackoutDays = days.filter((d) => d.blackout);
  const dayInfo = isISODate(day)
    ? selectScheduleDays(state, day.slice(0, 7)).find((d) => d.date === day)
    : undefined;
  useEffect(() => {
    setSelected((current) =>
      current.filter((id) => exceptions.some((order) => order.id === id)),
    );
  }, [state.revision, query, issue]);
  const movingOrders = state.orders.filter((order) =>
    moveIds.includes(order.id),
  );
  const previewed =
    !!state.scheduleProposal &&
    state.scheduleProposal.date === targetDate &&
    JSON.stringify(state.scheduleProposal.orderIds) === JSON.stringify(moveIds);
  const guard = useUnsavedChanges(
    (dialog === "rules" &&
      JSON.stringify(rules) !== JSON.stringify(state.scheduleRules)) ||
      (dialog === "reschedule" && !!state.scheduleProposal),
  );
  function openRules() {
    setRules(structuredClone(state.scheduleRules));
    setErrors([]);
    setDiscard(false);
    setDialog("rules");
  }
  function closeDialog() {
    if (
      dialog === "rules" &&
      JSON.stringify(rules) !== JSON.stringify(state.scheduleRules) &&
      !discard
    ) {
      setDiscard(true);
      return;
    }
    dispatch({ type: "schedule/cancel" });
    setDialog(null);
    setErrors([]);
    setDiscard(false);
  }
  function beginMove(ids: string[]) {
    const chosen = ids.length
      ? ids
      : allExceptions.length
        ? [allExceptions[0].id]
        : state.orders
            .filter(
              (o) =>
                o.fulfillment === "Scheduled" &&
                o.fulfillmentDate >= "2026-12-01",
            )
            .slice(0, 1)
            .map((o) => o.id);
    setMoveIds(chosen);
    setErrors([]);
    setTargetDate("2026-12-29");
    dispatch({ type: "schedule/cancel" });
    setDialog("reschedule");
  }
  function moveMonth(delta: number) {
    navigate(
      `/scheduling?month=${addMonths(`${month}-01`, delta).slice(0, 7)}`,
    );
  }
  function applyMove() {
    const validation = validateScheduleProposal(state, {
      orderIds: moveIds,
      date: targetDate,
    });
    setErrors(validation);
    if (!validation.length && dispatch({ type: "schedule/apply" })) {
      setDialog(null);
      setSelected([]);
      notify(
        "Schedule updated in the demo. The unresolved queue and daily counts have been recalculated.",
      );
    }
  }
  return (
    <div className="scheduling-route">
      <div className="schedule-top-action">
        <Button primary onClick={() => beginMove(selected)}>
          <Play size={17} /> Simulate changes
        </Button>
      </div>
      <div className="schedule-layout">
        <div className="schedule-main-column">
          <div className="schedule-metrics">
            <div className="schedule-stat">
              <CalendarDays />
              <div>
                <span>Planned fulfillments</span>
                <strong>
                  {days.reduce((sum, item) => sum + item.count, 0)}
                </strong>
              </div>
              <small>{monthLabel(month)}</small>
            </div>
            <div className="schedule-stat warning">
              <AlertTriangle />
              <div>
                <span>Needs scheduling</span>
                <strong>{allExceptions.length}</strong>
              </div>
              <small>Unresolved scenario orders</small>
            </div>
            <div className="schedule-stat danger">
              <ChartNoAxesColumn />
              <div>
                <span>Days over capacity</span>
                <strong>{over.length}</strong>
              </div>
              <small>
                Above {state.scheduleRules.capacity} fulfillments / day
              </small>
            </div>
            <div className="schedule-stat muted">
              <Ban />
              <div>
                <span>Blackout dates</span>
                <strong>{blackoutDays.length}</strong>
              </div>
              <small>In the displayed month</small>
            </div>
          </div>
          <Panel className="fulfillment-calendar">
            <div className="panel-header">
              <div>
                <h2>Fulfillment calendar</h2>
                <p>
                  Scheduled fulfillments by date. Darker days are closer to
                  capacity.
                </p>
              </div>
              <div className="toolbar calendar-nav">
                <span className="calendar-month">
                  <CalendarDays size={17} />
                  {monthLabel(month)}
                </span>
                <IconButton
                  icon={ChevronLeft}
                  label="Previous schedule month"
                  onClick={() => moveMonth(-1)}
                />
                <IconButton
                  icon={ChevronRight}
                  label="Next schedule month"
                  onClick={() => moveMonth(1)}
                />
              </div>
            </div>
            <div className="schedule-legend">
              <span>
                Low volume <i className="density-dot faint" />
                <i className="density-dot medium" />
                <i className="density-dot strong" /> High
              </span>
              <span>
                <i className="status-dot amber" />
                Near limit
              </span>
              <span>
                <i className="status-dot red" />
                Over capacity
              </span>
              <span>
                <i className="blackout-key" />
                Blackout
              </span>
              <strong>Daily capacity: {state.scheduleRules.capacity}</strong>
            </div>
            <div className="mobile-schedule-toggle">
              <Button onClick={() => setMobileCalendar(!mobileCalendar)}>
                {mobileCalendar ? (
                  <List size={16} />
                ) : (
                  <CalendarDays size={16} />
                )}
                {mobileCalendar ? "Show agenda" : "Show calendar"}
              </Button>
            </div>
            <div
              className={`schedule-calendar-scroll ${mobileCalendar ? "show-mobile-calendar" : ""}`}
            >
              <div
                className="schedule-calendar"
                role="group"
                aria-label={`${monthLabel(month)} fulfillment calendar`}
              >
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(
                  (label) => (
                    <div className="weekday" key={label}>
                      {label}
                    </div>
                  ),
                )}
                {monthCells(month).map((date, index) => {
                  const info = days.find((d) => d.date === date);
                  if (!date || !info)
                    return (
                      <div
                        className="outside-day"
                        aria-hidden="true"
                        key={`empty-${index}`}
                      />
                    );
                  return (
                    <button
                      key={date}
                      className={`calendar-day ${info.status} density-${Math.min(3, Math.floor((info.count / Math.max(1, info.capacity)) * 4))}`}
                      onClick={() => {
                        setDay(date);
                        setDialog("day");
                      }}
                      aria-label={`${dateLabel(date)}: ${info.count} scheduled, capacity ${info.capacity}${info.blackout ? ", blackout" : info.status === "over-capacity" ? ", over capacity" : info.status === "near-limit" ? ", near limit" : ""}`}
                    >
                      <span className="calendar-date">
                        {Number(date.slice(-2))}
                        {["over-capacity", "blackout"].includes(info.status) &&
                          info.count > 0 && <AlertTriangle size={13} />}
                      </span>
                      <span className="calendar-count">
                        {info.blackout ? (
                          <>
                            <Ban size={13} />
                            <span>
                              Blackout{info.count > 0 ? ` · ${info.count}` : ""}
                            </span>
                          </>
                        ) : (
                          <>
                            <strong>{info.count}</strong>
                            <span>scheduled</span>
                          </>
                        )}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
            <div
              className={`schedule-agenda ${mobileCalendar ? "hide-mobile-agenda" : ""}`}
            >
              <Field label="Inspect any day">
                <input
                  type="date"
                  value={day}
                  onChange={(e) => {
                    setDay(e.target.value);
                    if (e.target.value) setDialog("day");
                  }}
                />
              </Field>
              {days
                .filter((d) => d.count || d.blackout)
                .map((info) => (
                  <button
                    key={info.date}
                    className="agenda-day"
                    onClick={() => {
                      setDay(info.date);
                      setDialog("day");
                    }}
                  >
                    <span>
                      <strong>{dateLabel(info.date)}</strong>
                      <small>
                        {info.count} scheduled / {info.capacity} capacity
                      </small>
                    </span>
                    <Badge
                      tone={
                        info.blackout || info.status === "over-capacity"
                          ? "red"
                          : info.status === "near-limit"
                            ? "amber"
                            : "violet"
                      }
                    >
                      {info.blackout
                        ? "Blackout"
                        : info.status === "over-capacity"
                          ? "Over capacity"
                          : info.status === "near-limit"
                            ? "Near limit"
                            : "Available"}
                    </Badge>
                  </button>
                ))}
              {!days.some((d) => d.count || d.blackout) && (
                <Empty title="No fulfillments this month">
                  Navigate to December 2026 to explore the populated scheduling
                  scenario.
                </Empty>
              )}
            </div>
            <p className="schedule-scenario-note">
              Future scenario · December 2026 · Lead-time clock: December 1 ·{" "}
              {state.timezone}
            </p>
          </Panel>
        </div>
        <aside className="schedule-tools-column">
          <Panel>
            <h2>Schedule tools</h2>
            <div className="schedule-tools">
              {[
                {
                  title: "Scheduling rules",
                  description: "Set lead times and eligible fulfillment days.",
                  icon: SlidersHorizontal,
                },
                {
                  title: "Blackout dates",
                  description: "Block dates when fulfillment is unavailable.",
                  icon: CalendarDays,
                },
                {
                  title: "Capacity limits",
                  description:
                    "Set daily limits and identify dates to rebalance.",
                  icon: ChartNoAxesColumn,
                },
              ].map(({ title, description, icon: Icon }) => (
                <button key={title} onClick={openRules}>
                  <span className="icon-tile">
                    <Icon size={22} />
                  </span>
                  <span>
                    <strong>{title}</strong>
                    <small>{description}</small>
                  </span>
                  <ChevronRight size={17} />
                </button>
              ))}
            </div>
          </Panel>
          <Panel>
            <h2>Capacity overview</h2>
            <p>{monthLabel(month)}</p>
            <dl className="capacity-definition">
              <div>
                <dt>Daily limit</dt>
                <dd>{state.scheduleRules.capacity} fulfillments</dd>
              </div>
              <div>
                <dt>Peak date</dt>
                <dd>
                  {peak?.count
                    ? `${dateLabel(peak.date).replace(", 2026", "")} · ${peak.count} planned`
                    : "No scheduled orders"}
                </dd>
              </div>
              <div>
                <dt>Above capacity</dt>
                <dd className={over.length ? "negative" : ""}>
                  {over.length} {over.length === 1 ? "day" : "days"}
                </dd>
              </div>
              <div>
                <dt>Blackout dates</dt>
                <dd>
                  {blackoutDays.length
                    ? blackoutDays
                        .map((d) => Number(d.date.slice(-2)))
                        .join(", ")
                    : "None"}
                </dd>
              </div>
              <div>
                <dt>Needs scheduling</dt>
                <dd>{allExceptions.length} orders</dd>
              </div>
            </dl>
          </Panel>
        </aside>
      </div>
      <Panel className="scheduling-attention">
        <div className="panel-header">
          <div>
            <h2>Orders needing scheduling attention</h2>
            <p>
              Review unresolved conflicts. Cleared scheduled orders leave this
              queue.
            </p>
          </div>
          <div className="toolbar">
            <input
              className="text-input"
              aria-label="Search scheduling actions"
              placeholder="Search orders or products…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <Select
              aria-label="Scheduling issue filter"
              value={issue}
              onChange={(e) => setIssue(e.target.value)}
            >
              <option value="all">All issues</option>
              <option>Over daily capacity</option>
              <option>Blackout date</option>
              <option>Lead time required</option>
            </Select>
          </div>
        </div>
        {selected.length > 0 && (
          <div className="toolbar schedule-selection">
            <span>{selected.length} selected</span>
            <Button onClick={() => beginMove(selected)}>
              Reschedule selected
            </Button>
            <Button onClick={() => setSelected([])}>Clear selection</Button>
          </div>
        )}
        <div className="schedule-attention-table">
          <table>
            <thead>
              <tr>
                <th>
                  <input
                    type="checkbox"
                    aria-label="Select all unresolved scheduling orders"
                    checked={
                      exceptions.length > 0 &&
                      exceptions.every((o) => selected.includes(o.id))
                    }
                    onChange={(e) =>
                      setSelected(
                        e.target.checked ? exceptions.map((o) => o.id) : [],
                      )
                    }
                  />
                </th>
                <th>Order</th>
                <th>Sample customer</th>
                <th>Product</th>
                <th>Current date</th>
                <th>Issue</th>
                <th>Next action</th>
              </tr>
            </thead>
            <tbody>
              {exceptions.map((order) => (
                <tr key={order.id}>
                  <td>
                    <input
                      type="checkbox"
                      aria-label={`Select scheduling order ${order.number}`}
                      checked={selected.includes(order.id)}
                      onChange={(e) =>
                        setSelected(
                          e.target.checked
                            ? [...selected, order.id]
                            : selected.filter((id) => id !== order.id),
                        )
                      }
                    />
                  </td>
                  <td>
                    <a href={`#/orders/${order.id}`}>{order.number}</a>
                  </td>
                  <td>{order.customer}</td>
                  <td>
                    <a href={`#/products/${order.lines[0].productId}`}>
                      {
                        state.products.find(
                          (p) => p.id === order.lines[0].productId,
                        )?.name
                      }
                    </a>
                  </td>
                  <td>{dateLabel(order.fulfillmentDate)}</td>
                  <td>
                    <Badge tone="red">{order.reason}</Badge>
                  </td>
                  <td>
                    <Button
                      className="link"
                      onClick={() => beginMove([order.id])}
                    >
                      Review <ArrowRight size={16} />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="schedule-action-cards">
          {exceptions.map((order) => (
            <article key={order.id}>
              <div className="toolbar">
                <label className="check-line">
                  <input
                    type="checkbox"
                    checked={selected.includes(order.id)}
                    aria-label={`Select ${order.number} to reschedule`}
                    onChange={(e) =>
                      setSelected(
                        e.target.checked
                          ? [...selected, order.id]
                          : selected.filter((id) => id !== order.id),
                      )
                    }
                  />
                  {order.number}
                </label>
                <Badge tone="red">{order.reason}</Badge>
              </div>
              <strong>
                {
                  state.products.find((p) => p.id === order.lines[0].productId)
                    ?.name
                }
              </strong>
              <p>Fulfillment: {dateLabel(order.fulfillmentDate)}</p>
              <Button onClick={() => beginMove([order.id])}>
                Review schedule <ArrowRight size={16} />
              </Button>
            </article>
          ))}
        </div>
        {!exceptions.length && (
          <Empty
            title={
              allExceptions.length
                ? "No matching scheduling actions"
                : "No unresolved scheduling actions"
            }
          >
            {allExceptions.length
              ? "Try another search or issue filter."
              : "The sample schedule fits the current rules and capacity."}
          </Empty>
        )}
        <div className="schedule-table-note">
          <span>{exceptions.length} orders requiring action</span>
          <span>
            Billing, fulfillment, and estimated delivery are distinct dates.
          </span>
        </div>
      </Panel>
      {dialog === "day" && (
        <Modal
          title={day ? dateLabel(day) : "Scheduled fulfillments"}
          onClose={closeDialog}
        >
          <p>
            {dayInfo?.count ?? 0} scheduled · daily capacity{" "}
            {state.scheduleRules.capacity}
            {dayInfo?.blackout ? " · Blackout date" : ""}
          </p>
          <div className="schedule-day-orders">
            {(dayInfo?.orders ?? []).map((order) => (
              <div key={order.id}>
                <span>
                  <strong>{order.number}</strong>
                  <small>
                    {
                      state.products.find(
                        (p) => p.id === order.lines[0].productId,
                      )?.name
                    }
                  </small>
                </span>
                <Button onClick={() => beginMove([order.id])}>
                  Reschedule
                </Button>
              </div>
            ))}
          </div>
          {!dayInfo?.count && <p>No sample fulfillments on this day.</p>}
          <div className="dialog-footer">
            <Button onClick={closeDialog}>Close</Button>
          </div>
        </Modal>
      )}
      {dialog === "reschedule" && (
        <Modal title="Simulate a schedule change" onClose={closeDialog} wide>
          <p>
            Preview a proposed fulfillment date. Applying affects these sample
            orders only; billing dates stay unchanged.
          </p>
          <div className="schedule-move-list">
            {movingOrders.map((order) => (
              <div key={order.id}>
                <strong>{order.number}</strong>
                <span>
                  {dateLabel(order.fulfillmentDate)}
                  <ArrowRight size={14} />
                  {previewed ? dateLabel(targetDate) : "Proposed date"}
                </span>
              </div>
            ))}
          </div>
          <div className="form-grid">
            <Field label="Proposed fulfillment date">
              <input
                type="date"
                min={addDays("2026-12-01", state.scheduleRules.leadDays)}
                value={targetDate}
                onChange={(e) => {
                  setTargetDate(e.target.value);
                  setErrors([]);
                  dispatch({ type: "schedule/cancel" });
                }}
              />
            </Field>
            <div className="notice">
              Capacity: {state.scheduleRules.capacity} orders/day
              <br />
              Lead time: {state.scheduleRules.leadDays} days from December 1
              <br />
              Estimated delivery:{" "}
              {isISODate(targetDate)
                ? dateLabel(addDays(targetDate, 3))
                : "Choose a valid date"}
            </div>
          </div>
          {errors.length > 0 && (
            <div role="alert" className="error">
              {errors.map((error) => (
                <p key={error}>{error}</p>
              ))}
            </div>
          )}
          {previewed && (
            <div className="notice schedule-preview" role="status">
              <strong>Proposed change — not applied</strong>
              <p>
                {moveIds.length} order{moveIds.length === 1 ? "" : "s"} will
                move to {dateLabel(targetDate)}. Current capacity and blackout
                rules will be checked again on apply.
              </p>
            </div>
          )}
          <div className="dialog-footer">
            <Button onClick={closeDialog}>Cancel</Button>
            <Button
              onClick={() => {
                const validation = validateScheduleProposal(state, {
                  orderIds: moveIds,
                  date: targetDate,
                });
                setErrors(validation);
                if (!validation.length)
                  dispatch({
                    type: "schedule/preview",
                    proposal: { orderIds: moveIds, date: targetDate },
                  });
              }}
            >
              Preview changes
            </Button>
            <Button primary disabled={!previewed} onClick={applyMove}>
              Apply to demo
            </Button>
          </div>
        </Modal>
      )}
      {dialog === "rules" && (
        <Modal
          title={discard ? "Discard rule changes?" : "Demo scheduling rules"}
          onClose={closeDialog}
        >
          {discard ? (
            <>
              <p>
                Your edited rules have not been applied. Discard them or
                continue editing.
              </p>
              <div className="dialog-footer">
                <Button onClick={() => setDiscard(false)}>Keep editing</Button>
                <Button
                  danger
                  onClick={() => {
                    setDiscard(false);
                    setDialog(null);
                  }}
                >
                  Discard changes
                </Button>
              </div>
            </>
          ) : (
            <>
              <p>
                Changing a rule recalculates unresolved scheduling actions.
                Existing sample orders stay in place until you reschedule them.
              </p>
              <div className="form-grid">
                <Field label="Daily capacity">
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={rules.capacity}
                    onChange={(e) =>
                      setRules({ ...rules, capacity: Number(e.target.value) })
                    }
                  />
                </Field>
                <Field label="Minimum lead time (days)">
                  <input
                    type="number"
                    min="0"
                    max="30"
                    value={rules.leadDays}
                    onChange={(e) =>
                      setRules({ ...rules, leadDays: Number(e.target.value) })
                    }
                  />
                </Field>
              </div>
              <label className="check-line schedule-checkbox">
                <input
                  type="checkbox"
                  checked={rules.weekendBlackout}
                  onChange={(e) =>
                    setRules({ ...rules, weekendBlackout: e.target.checked })
                  }
                />
                Black out Saturdays and Sundays
              </label>
              <hr />
              <h3>Blackout dates</h3>
              <div className="schedule-blackout-entry">
                <Field label="Add blackout date">
                  <input
                    type="date"
                    value={blackout}
                    onChange={(e) => setBlackout(e.target.value)}
                  />
                </Field>
                <Button
                  disabled={
                    !isISODate(blackout) ||
                    rules.blackoutDates.includes(blackout)
                  }
                  onClick={() =>
                    setRules({
                      ...rules,
                      blackoutDates: [...rules.blackoutDates, blackout].sort(),
                    })
                  }
                >
                  Add date
                </Button>
              </div>
              <div className="schedule-blackout-list">
                {rules.blackoutDates.map((date) => (
                  <div key={date}>
                    <span>{dateLabel(date)}</span>
                    <Button
                      aria-label={`Remove blackout on ${dateLabel(date)}`}
                      onClick={() =>
                        setRules({
                          ...rules,
                          blackoutDates: rules.blackoutDates.filter(
                            (value) => value !== date,
                          ),
                        })
                      }
                    >
                      Remove
                    </Button>
                  </div>
                ))}
              </div>
              {errors.length > 0 && (
                <div role="alert" className="error">
                  {errors.map((error) => (
                    <p key={error}>{error}</p>
                  ))}
                </div>
              )}
              <div className="dialog-footer">
                <Button onClick={closeDialog}>Cancel</Button>
                <Button
                  primary
                  onClick={() => {
                    const validation = validateScheduleRules(rules);
                    setErrors(validation);
                    if (
                      !validation.length &&
                      dispatch({ type: "schedule/rules", rules })
                    ) {
                      setDialog(null);
                      notify(
                        "Demo scheduling rules applied. Review the refreshed unresolved queue.",
                      );
                    }
                  }}
                >
                  Apply rules to demo
                </Button>
              </div>
            </>
          )}
        </Modal>
      )}
      {guard.pending && (
        <Modal title="Discard unsaved schedule changes?" onClose={guard.cancel}>
          <p>
            Your proposed changes have not been applied. Stay here to continue
            editing, or leave without applying them.
          </p>
          <div className="dialog-footer">
            <Button onClick={guard.cancel}>Keep editing</Button>
            <Button
              danger
              onClick={() => {
                dispatch({ type: "schedule/cancel" });
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
