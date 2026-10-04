import type { DemoAction, DemoState } from "./model";
import { addDays, isISODate, nextOccurrence } from "./calendar";
import { createInitialState } from "../fixtures";
import {
  canReleaseOrder,
  validateAutomation,
  validatePurchase,
  validateReport,
  validateScheduleProposal,
  validateScheduleRules,
} from "./validation";
export { createInitialState } from "../fixtures";

function changed(
  state: DemoState,
  patch: Partial<DemoState>,
  message?: string,
): DemoState {
  const revision = state.revision + 1;
  return {
    ...state,
    ...patch,
    revision,
    activity: message
      ? [
          { id: `activity-${revision}`, date: state.snapshot, message },
          ...state.activity,
        ].slice(0, 100)
      : state.activity,
  };
}
/** Invalid/stale commands are no-ops. Forms expose validation errors before dispatch. */
export function demoReducer(state: DemoState, action: DemoAction): DemoState {
  switch (action.type) {
    case "order/release": {
      if (!canReleaseOrder(state, action.id)) return state;
      const order = state.orders.find((o) => o.id === action.id)!;
      return changed(
        state,
        {
          orders: state.orders.map((o) =>
            o.id === action.id
              ? {
                  ...o,
                  release: "Released",
                  fulfillment: "Scheduled",
                  attention: undefined,
                }
              : o,
          ),
        },
        `${order.number} released in the demo.`,
      );
    }
    case "order/complete": {
      const order = state.orders.find((o) => o.id === action.id);
      if (
        !order ||
        order.payment !== "Paid" ||
        order.release !== "Released" ||
        order.fulfillment === "Cancelled"
      )
        return state;
      return changed(
        state,
        {
          orders: state.orders.map((o) =>
            o.id === action.id
              ? {
                  ...o,
                  release: "Complete",
                  fulfillment: "Fulfilled",
                  attention: undefined,
                }
              : o,
          ),
        },
        `${order.number} marked fulfilled in the demo.`,
      );
    }
    case "subscription/status": {
      const subscription = state.subscriptions.find((s) => s.id === action.id);
      if (
        !subscription ||
        subscription.status === "Cancelled" ||
        subscription.status === action.status
      )
        return state;
      return changed(
        state,
        {
          subscriptions: state.subscriptions.map((s) =>
            s.id === action.id ? { ...s, status: action.status } : s,
          ),
        },
        `${subscription.id} ${action.status === "Paused" ? "paused" : "resumed"} locally.`,
      );
    }
    case "subscription/skip": {
      const subscription = state.subscriptions.find((s) => s.id === action.id);
      if (!subscription || subscription.status !== "Active") return state;
      const nextDate = nextOccurrence(
        subscription.nextDate,
        subscription.frequency,
      );
      const orderIds = state.orders
        .filter(
          (o) =>
            o.subscriptionId === subscription.id &&
            o.fulfillment === "Scheduled" &&
            o.fulfillmentDate === subscription.nextDate,
        )
        .map((o) => o.id);
      if (
        orderIds.length &&
        validateScheduleProposal(state, { orderIds, date: nextDate }).length
      )
        return state;
      return changed(
        state,
        {
          subscriptions: state.subscriptions.map((s) =>
            s.id === action.id ? { ...s, nextDate } : s,
          ),
          orders: state.orders.map((o) =>
            o.subscriptionId === subscription.id &&
            o.fulfillment === "Scheduled" &&
            o.fulfillmentDate === subscription.nextDate
              ? {
                  ...o,
                  fulfillmentDate: nextDate,
                  billingDate: addDays(nextDate, -2),
                  deliveryDate: addDays(nextDate, 3),
                  release: "Ready",
                  attention: undefined,
                }
              : o,
          ),
        },
        `${subscription.id} skipped to ${nextDate} in the demo.`,
      );
    }
    case "subscription/reason": {
      const subscription = state.subscriptions.find((s) => s.id === action.id);
      if (
        !subscription ||
        subscription.status !== "Cancelled" ||
        !action.reason.trim() ||
        subscription.cancellationReason === action.reason.trim()
      )
        return state;
      return changed(
        state,
        {
          subscriptions: state.subscriptions.map((s) =>
            s.id === action.id
              ? { ...s, cancellationReason: action.reason.trim() }
              : s,
          ),
        },
        `Cancellation category updated for ${subscription.id}.`,
      );
    }
    case "purchase/draft":
      if (
        !state.products.some((p) => p.id === action.productId) ||
        validatePurchase(action.config).length
      )
        return state;
      return changed(
        state,
        {
          purchaseDrafts: {
            ...state.purchaseDrafts,
            [action.productId]: structuredClone(action.config),
          },
        },
        "Purchase-options draft saved locally.",
      );
    case "purchase/apply": {
      const config = action.config ?? state.purchaseDrafts[action.productId];
      if (
        !config ||
        !state.products.some((p) => p.id === action.productId) ||
        validatePurchase(config).length
      )
        return state;
      if (
        JSON.stringify(config) ===
          JSON.stringify(state.purchaseApplied[action.productId]) &&
        JSON.stringify(config) ===
          JSON.stringify(state.purchaseDrafts[action.productId])
      )
        return state;
      return changed(
        state,
        {
          purchaseDrafts: {
            ...state.purchaseDrafts,
            [action.productId]: structuredClone(config),
          },
          purchaseApplied: {
            ...state.purchaseApplied,
            [action.productId]: structuredClone(config),
          },
        },
        "Purchase options applied to the demo store.",
      );
    }
    case "cart/add":
      if (
        state.cart.some((item) => item.id === action.item.id) ||
        !state.products.some((p) => p.id === action.item.productId) ||
        !Number.isInteger(action.item.quantity) ||
        action.item.quantity < 1 ||
        action.item.quantity > 20 ||
        !Number.isInteger(action.item.unitPriceCents) ||
        action.item.unitPriceCents < 0
      )
        return state;
      return changed(
        state,
        { cart: [...state.cart, structuredClone(action.item)] },
        "Sample item added to the local cart. No checkout is available.",
      );
    case "schedule/rules":
      if (validateScheduleRules(action.rules).length) return state;
      return changed(
        state,
        { scheduleRules: structuredClone(action.rules) },
        "Demo scheduling rules updated.",
      );
    case "schedule/preview":
      return {
        ...state,
        scheduleProposal: {
          orderIds: [...new Set(action.proposal.orderIds)],
          date: action.proposal.date,
        },
      };
    case "schedule/cancel":
      return state.scheduleProposal
        ? { ...state, scheduleProposal: null }
        : state;
    case "schedule/apply": {
      const proposal = state.scheduleProposal;
      if (!proposal || validateScheduleProposal(state, proposal).length)
        return state;
      if (
        !state.orders.some(
          (o) =>
            proposal.orderIds.includes(o.id) &&
            o.fulfillmentDate !== proposal.date,
        )
      )
        return { ...state, scheduleProposal: null };
      return changed(
        state,
        {
          scheduleProposal: null,
          subscriptions: state.subscriptions.map((subscription) =>
            state.orders.some(
              (order) =>
                proposal.orderIds.includes(order.id) &&
                order.subscriptionId === subscription.id &&
                order.fulfillmentDate === subscription.nextDate,
            )
              ? { ...subscription, nextDate: proposal.date }
              : subscription,
          ),
          orders: state.orders.map((o) =>
            proposal.orderIds.includes(o.id)
              ? {
                  ...o,
                  fulfillmentDate: proposal.date,
                  deliveryDate: addDays(proposal.date, 3),
                  release: "Ready",
                  attention: undefined,
                }
              : o,
          ),
        },
        `${proposal.orderIds.length} sample order${proposal.orderIds.length === 1 ? "" : "s"} rescheduled to ${proposal.date}. Billing dates retained.`,
      );
    }
    case "view/save": {
      if (!action.view.name.trim()) return state;
      return changed(
        state,
        {
          savedViews: [
            ...state.savedViews.filter((view) => view.id !== action.view.id),
            structuredClone({ ...action.view, name: action.view.name.trim() }),
          ],
        },
        `View “${action.view.name.trim()}” saved.`,
      );
    }
    case "view/delete":
      return state.savedViews.some((v) => v.id === action.id)
        ? changed(
            state,
            { savedViews: state.savedViews.filter((v) => v.id !== action.id) },
            "Saved view removed.",
          )
        : state;
    case "report/save":
      if (validateReport(action.report).length) return state;
      return changed(
        state,
        {
          reports: [
            ...state.reports.filter((r) => r.id !== action.report.id),
            structuredClone({
              ...action.report,
              name: action.report.name.trim(),
              updatedAt: state.snapshot,
            }),
          ],
        },
        `Report “${action.report.name.trim()}” saved locally.`,
      );
    case "report/delete": {
      if (!state.reports.some((r) => r.id === action.id)) return state;
      const referenced =
        state.automations.some((a) => a.reportId === action.id) ||
        state.insights.some((i) => i.reportId === action.id);
      if (
        referenced &&
        (!action.replacementId ||
          action.replacementId === action.id ||
          !state.reports.some((r) => r.id === action.replacementId))
      )
        return state;
      return changed(
        state,
        {
          reports: state.reports.filter((r) => r.id !== action.id),
          automations: state.automations.map((a) =>
            a.reportId === action.id
              ? { ...a, reportId: action.replacementId! }
              : a,
          ),
          insights: state.insights.map((i) =>
            i.reportId === action.id
              ? { ...i, reportId: action.replacementId! }
              : i,
          ),
        },
        "Report removed; linked records reassigned when needed.",
      );
    }
    case "automation/save":
      if (validateAutomation(state, action.automation).length) return state;
      return changed(
        state,
        {
          automations: [
            ...state.automations.filter((a) => a.id !== action.automation.id),
            structuredClone(action.automation),
          ],
        },
        `Automation “${action.automation.name}” saved as a local simulation.`,
      );
    case "automation/status": {
      const automation = state.automations.find((a) => a.id === action.id);
      if (!automation || automation.status === action.status) return state;
      return changed(
        state,
        {
          automations: state.automations.map((a) =>
            a.id === action.id ? { ...a, status: action.status } : a,
          ),
        },
        `Local automation ${action.status === "Paused" ? "paused" : "resumed"}.`,
      );
    }
    case "automation/duplicate": {
      const automation = state.automations.find((a) => a.id === action.id);
      if (!automation || state.automations.some((a) => a.id === action.newId))
        return state;
      return changed(
        state,
        {
          automations: [
            ...state.automations,
            {
              ...structuredClone(automation),
              id: action.newId,
              name: `${automation.name} (copy)`,
              status: "Paused",
            },
          ],
        },
        "Automation duplicated as a paused local configuration.",
      );
    }
    case "automation/delete":
      return state.automations.some((a) => a.id === action.id)
        ? changed(
            state,
            {
              automations: state.automations.filter((a) => a.id !== action.id),
            },
            "Local automation removed.",
          )
        : state;
    case "automation/test":
      return state.automations.some((a) => a.id === action.id)
        ? changed(
            state,
            {},
            "Local test prepared from sample data. No delivery was sent.",
          )
        : state;
    case "insight/save":
      return state.insights.some(
        (i) => i.id === action.id && i.saved !== action.saved,
      )
        ? changed(
            state,
            {
              insights: state.insights.map((i) =>
                i.id === action.id ? { ...i, saved: action.saved } : i,
              ),
            },
            action.saved
              ? "Sample insight saved."
              : "Sample insight removed from Saved.",
          )
        : state;
    case "task/add": {
      const insight = state.insights.find((i) => i.id === action.insightId);
      if (!insight || state.tasks.some((t) => t.insightId === action.insightId))
        return state;
      return changed(
        state,
        {
          tasks: [
            ...state.tasks,
            {
              id: `task-${insight.id}`,
              insightId: insight.id,
              title: insight.title,
              context: `${insight.summary}\n${insight.facts.join("\n")}\n${insight.recommendation}`,
              status: "todo",
              reminderDate: null,
              completedAt: null,
            },
          ],
        },
        "One local task added to To do.",
      );
    }
    case "task/reminder": {
      if (
        action.date &&
        (!isISODate(action.date) || action.date < state.snapshot.slice(0, 10))
      )
        return state;
      const withTask = state.tasks.some((t) => t.insightId === action.insightId)
        ? state
        : demoReducer(state, { type: "task/add", insightId: action.insightId });
      if (
        !withTask.tasks.some((t) => t.insightId === action.insightId) ||
        withTask.tasks.find((t) => t.insightId === action.insightId)
          ?.reminderDate === action.date
      )
        return withTask;
      return changed(
        withTask,
        {
          tasks: withTask.tasks.map((t) =>
            t.insightId === action.insightId
              ? { ...t, reminderDate: action.date }
              : t,
          ),
        },
        action.date
          ? `Local reminder recorded for ${action.date}. It does not run while the browser is closed.`
          : "Local reminder removed.",
      );
    }
    case "task/status": {
      if (
        !state.tasks.some(
          (t) => t.insightId === action.insightId && t.status !== action.status,
        )
      )
        return state;
      return changed(
        state,
        {
          tasks: state.tasks.map((t) =>
            t.insightId === action.insightId
              ? {
                  ...t,
                  status: action.status,
                  completedAt:
                    action.status === "completed" ? state.snapshot : null,
                }
              : t,
          ),
        },
        action.status === "completed"
          ? "Task completed locally. The underlying sample metric is unchanged."
          : "Task returned to To do.",
      );
    }
    case "preferences/update": {
      if (action.timezone) {
        try {
          new Intl.DateTimeFormat("en-US", {
            timeZone: action.timezone,
          }).format();
        } catch {
          return state;
        }
      }
      return changed(state, {
        preferences: { ...state.preferences, ...action.preferences },
        timezone: action.timezone ?? state.timezone,
      });
    }
    case "state/replace":
      return action.state;
    case "state/reset":
      return {
        ...createInitialState(),
        writerId: state.writerId,
        revision: state.revision + 1,
      };
  }
}
