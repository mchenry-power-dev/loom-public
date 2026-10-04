import type {
  Automation,
  DemoAction,
  DemoState,
  PurchaseConfig,
  Report,
  ScheduleProposal,
  ScheduleRules,
} from "./model";
import {
  addDays,
  isISODate,
  nextOccurrence,
  SCHEDULE_ANCHOR,
} from "./calendar";

export function validatePurchase(config: PurchaseConfig): string[] {
  const errors: string[] = [];
  if (!config.oneTime && !config.subscription && !config.prepaid.enabled)
    errors.push("Enable at least one purchase option.");
  if (
    !Number.isInteger(config.discount) ||
    config.discount < 0 ||
    config.discount > 50
  )
    errors.push(
      "Subscription discount must be a whole percentage from 0 to 50.",
    );
  if (
    (config.subscription || config.prepaid.enabled) &&
    (!config.frequencies.length ||
      !config.frequencies.includes(config.defaultFrequency))
  )
    errors.push("Choose a default frequency from the enabled frequencies.");
  if (
    config.prepaid.enabled &&
    (!Number.isInteger(config.prepaid.deliveries) ||
      config.prepaid.deliveries < 2 ||
      config.prepaid.deliveries > 12)
  )
    errors.push("Prepaid plans support 2 to 12 deliveries.");
  if (
    !Number.isInteger(config.prepaid.discount) ||
    config.prepaid.discount < 0 ||
    config.prepaid.discount > 50
  )
    errors.push("Prepaid discount must be a whole percentage from 0 to 50.");
  return errors;
}
export function validateScheduleRules(rules: ScheduleRules): string[] {
  const errors: string[] = [];
  if (
    !Number.isInteger(rules.capacity) ||
    rules.capacity < 1 ||
    rules.capacity > 100
  )
    errors.push("Daily capacity must be between 1 and 100.");
  if (
    !Number.isInteger(rules.leadDays) ||
    rules.leadDays < 0 ||
    rules.leadDays > 30
  )
    errors.push("Lead time must be between 0 and 30 days.");
  if (rules.blackoutDates.some((date) => !isISODate(date)))
    errors.push("Blackout dates must be valid calendar dates.");
  return errors;
}
export function validateScheduleProposal(
  state: DemoState,
  proposal: ScheduleProposal,
): string[] {
  const errors: string[] = [];
  const ids = [...new Set(proposal.orderIds)];
  if (!ids.length) errors.push("Select at least one scheduled order.");
  if (
    ids.some(
      (id) =>
        !state.orders.some(
          (order) =>
            order.id === id &&
            order.payment === "Paid" &&
            order.fulfillment === "Scheduled",
        ),
    )
  )
    errors.push("Only paid, scheduled demo orders can move.");
  if (!isISODate(proposal.date))
    return [...errors, "Choose a valid fulfillment date."];
  if (proposal.date < addDays(SCHEDULE_ANCHOR, state.scheduleRules.leadDays))
    errors.push(
      `Allow at least ${state.scheduleRules.leadDays} days after the December 1 scenario start.`,
    );
  const weekday = new Date(`${proposal.date}T12:00:00Z`).getUTCDay();
  if (
    state.scheduleRules.blackoutDates.includes(proposal.date) ||
    (state.scheduleRules.weekendBlackout && (weekday === 0 || weekday === 6))
  )
    errors.push("This date is a blackout day.");
  const already = state.orders.filter(
    (order) =>
      order.fulfillment === "Scheduled" &&
      order.fulfillmentDate === proposal.date &&
      !ids.includes(order.id),
  ).length;
  if (already + ids.length > state.scheduleRules.capacity)
    errors.push(
      `This move exceeds the daily capacity of ${state.scheduleRules.capacity}.`,
    );
  return errors;
}
export function canReleaseOrder(state: DemoState, id: string): boolean {
  const order = state.orders.find((o) => o.id === id);
  if (
    !order ||
    order.payment !== "Paid" ||
    !["Unfulfilled", "Scheduled"].includes(order.fulfillment) ||
    !["Needs review", "Ready"].includes(order.release)
  )
    return false;
  return (
    order.fulfillmentDate < SCHEDULE_ANCHOR ||
    validateScheduleProposal(state, {
      orderIds: [id],
      date: order.fulfillmentDate,
    }).length === 0
  );
}
export function validateReport(report: Report): string[] {
  const errors: string[] = [];
  const allowedMetrics = [
    "netRevenue",
    "orders",
    "aov",
    "subscriptionRevenue",
    "refundRate",
    "retention",
  ];
  if (!report.name.trim()) errors.push("Give the report a name.");
  if (!report.metrics.length) errors.push("Select at least one metric.");
  if (
    report.metrics.some((metric) => !allowedMetrics.includes(metric)) ||
    new Set(report.metrics).size !== report.metrics.length
  )
    errors.push("Choose distinct metrics from the supported catalog.");
  if (!report.visuals.length) errors.push("Add at least one visual.");
  if (
    new Set(report.visuals.map((visual) => visual.id)).size !==
    report.visuals.length
  )
    errors.push("Each visual needs a unique identifier.");
  if (
    report.visuals.some(
      (visual) =>
        !visual.id.trim() ||
        !visual.title.trim() ||
        !["line", "bar", "table", "cards"].includes(visual.type),
    )
  )
    errors.push("Each visual needs a title and a supported chart type.");
  if (report.visuals.some((visual) => !visual.metrics.length))
    errors.push("Each visual needs a metric.");
  if (
    report.visuals.some(
      (visual) =>
        visual.metrics.some(
          (metric) =>
            !allowedMetrics.includes(metric) ||
            !report.metrics.includes(metric),
        ) || new Set(visual.metrics).size !== visual.metrics.length,
    )
  )
    errors.push("Visuals must use distinct metrics selected for this report.");
  if (
    report.visuals.some(
      (visual) =>
        ["line", "bar"].includes(visual.type) &&
        visual.metrics.length > 1 &&
        visual.metrics.some((metric) =>
          ["refundRate", "retention"].includes(metric),
        ) &&
        visual.metrics.some(
          (metric) => !["refundRate", "retention"].includes(metric),
        ),
    )
  )
    errors.push(
      "Use separate chart visuals for rates and currency/count metrics.",
    );
  return errors;
}
export function validateAutomation(
  state: DemoState,
  automation: Automation,
): string[] {
  const errors: string[] = [];
  if (!automation.name.trim()) errors.push("Give the automation a name.");
  if (!state.reports.some((report) => report.id === automation.reportId))
    errors.push("Choose an existing saved report.");
  if (!automation.formats.length)
    errors.push("Choose at least one output format.");
  if (!automation.destinations.length)
    errors.push("Choose at least one simulated destination.");
  if (
    !Number.isFinite(automation.threshold) ||
    automation.threshold < 0 ||
    automation.threshold > 1000
  )
    errors.push("Choose a finite alert threshold from 0 to 1000 percent.");
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(automation.time))
    errors.push("Enter a valid 24-hour schedule time.");
  if (
    automation.cadence === "Weekly" &&
    (!Number.isInteger(automation.day) ||
      automation.day < 0 ||
      automation.day > 6)
  )
    errors.push("Choose a weekday.");
  if (
    automation.cadence === "Monthly" &&
    (!Number.isInteger(automation.day) ||
      automation.day < 1 ||
      automation.day > 31)
  )
    errors.push("Choose a monthly date from 1 to 31.");
  try {
    new Intl.DateTimeFormat("en-US", {
      timeZone: automation.timezone,
    }).format();
  } catch {
    errors.push("Choose a valid time zone.");
  }
  for (const destination of automation.destinations) {
    const value = automation.recipients[destination]?.trim() ?? "";
    if (!value) {
      errors.push(`Enter a sample ${destination} destination.`);
      continue;
    }
    if (
      destination === "Email" &&
      !value
        .split(",")
        .every((address) => /^[^\s@]+@[^\s@]+\.example$/.test(address.trim()))
    )
      errors.push("Use .example email addresses, separated by commas.");
    if (destination === "Slack" && !/^#[a-zA-Z0-9_-]+$/.test(value))
      errors.push("Use a sample Slack channel such as #sample-operations.");
    if (destination === "Text" && !/^\+?[\d\s()-]{7,22}$/.test(value))
      errors.push("Enter a sample phone number, such as +1 202 555 0140.");
  }
  if (
    automation.failureRecipient &&
    !/^[^\s@]+@[^\s@]+\.example$/.test(automation.failureRecipient.trim())
  )
    errors.push("Use a .example address for failure notifications.");
  return errors;
}
export function actionErrors(state: DemoState, action: DemoAction): string[] {
  switch (action.type) {
    case "subscription/skip": {
      const subscription = state.subscriptions.find(
        (item) => item.id === action.id,
      );
      if (!subscription || subscription.status !== "Active")
        return ["Only an active sample subscription can skip an occurrence."];
      const orderIds = state.orders
        .filter(
          (order) =>
            order.subscriptionId === action.id &&
            order.fulfillment === "Scheduled" &&
            order.fulfillmentDate === subscription.nextDate,
        )
        .map((order) => order.id);
      return orderIds.length
        ? validateScheduleProposal(state, {
            orderIds,
            date: nextOccurrence(subscription.nextDate, subscription.frequency),
          })
        : [];
    }
    case "order/release":
      return canReleaseOrder(state, action.id)
        ? []
        : [
            "Only a paid, eligible order can be released. Resolve scheduling conflicts first.",
          ];
    case "order/complete":
      return state.orders.some(
        (o) =>
          o.id === action.id &&
          o.payment === "Paid" &&
          o.release === "Released" &&
          o.fulfillment !== "Cancelled",
      )
        ? []
        : ["Release this paid order before marking it fulfilled."];
    case "purchase/draft":
      return validatePurchase(action.config);
    case "purchase/apply": {
      const config = action.config ?? state.purchaseDrafts[action.productId];
      return config
        ? validatePurchase(config)
        : ["Choose an existing sample product."];
    }
    case "schedule/rules":
      return validateScheduleRules(action.rules);
    case "schedule/preview":
      return validateScheduleProposal(state, action.proposal);
    case "schedule/apply":
      return state.scheduleProposal
        ? validateScheduleProposal(state, state.scheduleProposal)
        : ["Preview a proposed date before applying it."];
    case "report/save":
      return validateReport(action.report);
    case "report/delete":
      return (state.automations.some((a) => a.reportId === action.id) ||
        state.insights.some((i) => i.reportId === action.id)) &&
        (!action.replacementId ||
          action.replacementId === action.id ||
          !state.reports.some((r) => r.id === action.replacementId))
        ? [
            "This report is linked to automations or insights. Choose another saved report for those links before deleting it.",
          ]
        : [];
    case "automation/save":
      return validateAutomation(state, action.automation);
    case "task/reminder":
      return action.date &&
        (!isISODate(action.date) || action.date < state.snapshot.slice(0, 10))
        ? ["Choose a valid reminder date on or after the demo snapshot."]
        : [];
    default:
      return [];
  }
}
