import type {
  Automation,
  DemoState,
  Insight,
  Order,
  Product,
  PurchaseConfig,
  Report,
  Subscription,
} from "../domain/model";
import { addDays, SNAPSHOT } from "../domain/calendar";

export const PRODUCTS: Product[] = [
  {
    id: "daily-greens",
    name: "Daily Greens Powder",
    subtitle: "Your daily routine, simplified.",
    priceCents: 3400,
    color: "#507444",
    category: "Daily essentials",
  },
  {
    id: "plant-protein",
    name: "Protein Shake Mix",
    subtitle: "A simple pantry staple.",
    priceCents: 4200,
    color: "#9b7965",
    category: "Nutrition",
  },
  {
    id: "daily-vitamins",
    name: "Vitamin Refill Bundle",
    subtitle: "Made for everyday routines.",
    priceCents: 2400,
    color: "#9684b7",
    category: "Daily essentials",
  },
  {
    id: "skincare-refill",
    name: "Skincare Refill Set",
    subtitle: "A fresh start for your daily routine.",
    priceCents: 3800,
    color: "#c599a3",
    category: "Personal care",
  },
  {
    id: "hydration-blend",
    name: "Electrolyte Drink Mix",
    subtitle: "A refreshing addition to your routine.",
    priceCents: 2800,
    color: "#e29857",
    category: "Daily essentials",
  },
];
export const DEFAULT_PURCHASE: PurchaseConfig = {
  oneTime: true,
  subscription: true,
  discount: 10,
  frequencies: ["2 weeks", "Monthly"],
  defaultFrequency: "2 weeks",
  benefits: [
    "Save on every delivery",
    "Pause or cancel anytime",
    "Choose your delivery frequency",
  ],
  prepaid: { enabled: false, deliveries: 3, discount: 15 },
};
const NAMES = [
  "Alex Morgan",
  "Jordan Ellis",
  "Taylor Brooks",
  "Casey Rivera",
  "Riley Park",
  "Morgan Blake",
  "Jamie Reed",
  "Avery Quinn",
  "Sam Rowan",
  "Cameron Lane",
  "Drew Hayes",
  "Quinn Carter",
];
function createSubscriptions(): Subscription[] {
  return Array.from({ length: 48 }, (_, index) => ({
    id: `sub-${index + 1}`,
    customer: NAMES[index % NAMES.length],
    productId: PRODUCTS[index % PRODUCTS.length].id,
    status: index > 42 ? "Cancelled" : index > 38 ? "Paused" : "Active",
    frequency: index % 3 === 0 ? "4 weeks" : "Monthly",
    nextDate: addDays("2026-12-03", index % 24),
    startedDate: addDays("2026-01-05", index % 55),
    ...(index > 42
      ? {
          cancelledDate: addDays("2026-09-10", index - 43),
          cancellationReason: [
            "Too much product",
            "Price",
            "Other",
            "No longer needed",
            "Uncategorized",
          ][index - 43],
        }
      : {}),
  }));
}
function createOrders(): Order[] {
  const orders: Order[] = [];
  const contracts = createSubscriptions();
  let index = 0;
  for (let day = 0; day < 180; day++) {
    const date = addDays("2026-04-01", day);
    const dailyCount =
      day < 90 ? 3 : day < 120 ? 4 : day < 150 ? 6 : day < 156 ? 7 : 8;
    for (let slot = 0; slot < dailyCount; slot++, index++) {
      const product = PRODUCTS[(index + Math.floor(day / 7)) % PRODUCTS.length];
      const subscription = index % 4 !== 0;
      const matchingContracts = contracts.filter(
        (contract) =>
          contract.productId === product.id && contract.status === "Active",
      );
      const contract = matchingContracts[index % matchingContracts.length];
      const recent = day > 174;
      const failed = recent && index % 29 === 0;
      const cancelled = index % 61 === 0;
      const review = recent && index % 9 === 0 && !failed && !cancelled;
      const scheduled = recent && index % 3 === 0;
      orders.push({
        id: `ord-${index + 1}`,
        number: `#${10401 + index}`,
        customer: subscription
          ? contract.customer
          : NAMES[index % NAMES.length],
        date,
        type: subscription ? "Subscription" : "One-time",
        payment: failed ? "Failed" : cancelled ? "Refunded" : "Paid",
        fulfillment: cancelled
          ? "Cancelled"
          : recent
            ? scheduled
              ? "Scheduled"
              : "Unfulfilled"
            : "Fulfilled",
        release:
          cancelled || failed
            ? "Blocked"
            : review
              ? "Needs review"
              : recent
                ? "Ready"
                : "Complete",
        lines: [
          {
            productId: product.id,
            quantity: index % 7 === 0 ? 2 : 1,
            unitPriceCents: subscription
              ? Math.round(product.priceCents * 0.9)
              : product.priceCents,
          },
        ],
        refundCents: cancelled
          ? Math.round(product.priceCents * (subscription ? 0.9 : 1)) *
            (index % 7 === 0 ? 2 : 1)
          : 0,
        ...(subscription ? { subscriptionId: contract.id } : {}),
        billingDate: date,
        fulfillmentDate: addDays(date, 2),
        deliveryDate: addDays(date, 5),
        ...(review
          ? {
              attention:
                "Confirm the fulfillment date before releasing this sample order.",
            }
          : failed
            ? {
                attention:
                  "Payment failed. This order cannot be released in the demo.",
              }
            : {}),
      });
    }
  }
  // Distinct future scheduling scenario, excluded from snapshot reporting.
  for (let day = 3; day <= 28; day++) {
    const count = day === 10 ? 11 : day === 17 ? 9 : (day % 6) + 2;
    for (let item = 0; item < count; item++) {
      const id = `schedule-${day}-${item}`;
      const product = PRODUCTS[item % PRODUCTS.length];
      const date = `2026-12-${String(day).padStart(2, "0")}`;
      const attention = (day === 10 && item >= 10) || day === 25;
      orders.push({
        id,
        number: `#D${day}${String(item).padStart(2, "0")}`,
        customer: NAMES[(day + item) % NAMES.length],
        date: "2026-12-01",
        type: "Subscription",
        payment: "Paid",
        fulfillment: "Scheduled",
        release: attention ? "Needs review" : "Ready",
        lines: [
          {
            productId: product.id,
            quantity: 1,
            unitPriceCents: Math.round(product.priceCents * 0.9),
          },
        ],
        refundCents: 0,
        subscriptionId: `sub-${id}`,
        billingDate: addDays(date, -2),
        fulfillmentDate: date,
        deliveryDate: addDays(date, 3),
        ...(attention
          ? {
              attention:
                day === 25
                  ? "Scheduled on a blackout date."
                  : "Daily capacity exceeded. Move this order to an available date.",
            }
          : {}),
      });
    }
  }
  return orders;
}
export function initialReports(): Report[] {
  return [
    {
      id: "revenue-overview",
      name: "Revenue overview",
      template: "Revenue overview",
      period: "30d",
      compare: true,
      grouping: "week",
      purpose: "Track revenue and order performance",
      breakdown: "none",
      metrics: ["netRevenue", "orders", "aov"],
      visuals: [
        {
          id: "revenue-cards",
          title: "Performance at a glance",
          type: "cards",
          metrics: ["netRevenue", "orders", "aov"],
        },
        {
          id: "revenue-trend",
          title: "Revenue trend",
          type: "line",
          metrics: ["netRevenue"],
        },
      ],
      updatedAt: SNAPSHOT,
    },
    {
      id: "subscription-health",
      name: "Subscription health",
      template: "Subscription health",
      period: "30d",
      compare: true,
      grouping: "week",
      purpose: "Review subscription order revenue",
      breakdown: "type",
      metrics: ["subscriptionRevenue", "retention", "refundRate"],
      visuals: [
        {
          id: "subscription-cards",
          title: "Subscription metrics",
          type: "cards",
          metrics: ["subscriptionRevenue", "retention", "refundRate"],
        },
        {
          id: "subscription-trend",
          title: "Subscription revenue",
          type: "bar",
          metrics: ["subscriptionRevenue"],
        },
      ],
      updatedAt: SNAPSHOT,
    },
    {
      id: "product-performance",
      name: "Product performance",
      template: "Product performance",
      period: "30d",
      compare: true,
      grouping: "week",
      purpose: "Compare product performance",
      breakdown: "product",
      metrics: ["netRevenue", "orders"],
      visuals: [
        {
          id: "product-table",
          title: "Product performance",
          type: "table",
          metrics: ["netRevenue", "orders"],
        },
      ],
      updatedAt: SNAPSHOT,
    },
  ];
}
export function initialAutomations(): Automation[] {
  return [
    {
      id: "auto-weekly",
      name: "Weekly performance report",
      type: "Report",
      reportId: "revenue-overview",
      cadence: "Weekly",
      day: 1,
      time: "09:00",
      timezone: "America/New_York",
      formats: ["PDF", "Excel"],
      destinations: ["Email"],
      recipients: { Email: "team@demo.example" },
      message: "Sample weekly performance snapshot.",
      summaryInstructions:
        "Summarize revenue, orders, and subscription trends from the selected report.",
      summaryInBody: true,
      attachments: true,
      failureRecipient: "",
      status: "Active",
      folder: "Weekly reporting",
      threshold: 10,
    },
    {
      id: "auto-alert",
      name: "Revenue threshold alert",
      type: "Alert",
      reportId: "revenue-overview",
      cadence: "On trigger",
      day: 1,
      time: "09:00",
      timezone: "America/New_York",
      formats: ["AI Summary"],
      destinations: ["Slack"],
      recipients: { Slack: "#sample-operations" },
      message: "Review the sample revenue threshold.",
      summaryInstructions: "Use the fixed report facts.",
      summaryInBody: true,
      attachments: false,
      failureRecipient: "",
      status: "Active",
      folder: "Operational alerts",
      threshold: 15,
    },
    {
      id: "auto-briefing",
      name: "Monday store briefing",
      type: "AI briefing",
      reportId: "subscription-health",
      cadence: "Weekly",
      day: 1,
      time: "08:30",
      timezone: "America/New_York",
      formats: ["AI Summary", "PowerPoint"],
      destinations: ["Teams"],
      recipients: { Teams: "Sample commerce team" },
      message: "Prepared from synthetic data. No live AI.",
      summaryInstructions:
        "Highlight subscription metrics and suggest one investigation.",
      summaryInBody: true,
      attachments: true,
      failureRecipient: "",
      status: "Paused",
      folder: "Weekly reporting",
      threshold: 10,
    },
  ];
}
export function initialInsights(): Insight[] {
  return [
    {
      id: "insight-revenue",
      title: "Revenue is growing with order volume",
      category: "Revenue",
      change: "30-day view",
      tone: "positive",
      summary:
        "The sample reporting period contains more paid orders than the preceding period. Revenue and order volume move together in this fixture.",
      facts: [
        "Revenue is the sum of paid line totals less recorded refunds.",
        "The current period is August 29 to September 27, 2026.",
        "Comparisons use the immediately preceding 30 calendar days.",
      ],
      recommendation:
        "Compare the product mix and average order value before treating this as a change in demand. The fixture does not establish a cause.",
      reportId: "revenue-overview",
      questions: [
        {
          question: "How is revenue calculated?",
          answer:
            "Paid and refunded orders contribute gross line totals; recorded refunds are subtracted. Failed and pending payments contribute zero. Shipping and tax are outside this sample.",
        },
        {
          question: "What should I investigate next?",
          answer:
            "Open Product performance to compare product revenue and units in the same period. The demo has no campaign attribution or acquisition data.",
        },
      ],
      saved: false,
    },
    {
      id: "insight-subscriptions",
      title: "Subscription orders support repeat revenue",
      category: "Subscriptions",
      change: "Sample insight",
      tone: "positive",
      summary:
        "Most synthetic orders use a subscription purchase option. Review revenue share alongside contract status; those are different measures.",
      facts: [
        "Subscription revenue includes paid subscription orders less their refunds.",
        "The fixture contains active, paused, and cancelled contracts.",
        "Retained contracts include active and paused contracts in the stated starting cohort.",
      ],
      recommendation:
        "Review paused subscriptions and cancellation categories for context. Do not infer customer motivation from revenue alone.",
      reportId: "subscription-health",
      questions: [
        {
          question: "Does retention equal active contracts?",
          answer:
            "No. Retention uses contracts that existed at the start of the reporting period as its denominator; those not cancelled at the snapshot are retained, including paused contracts.",
        },
        {
          question: "Are these live customer insights?",
          answer:
            "No. Every record is synthetic and all explanations are predetermined sample content. There is no model call or live store connection.",
        },
      ],
      saved: false,
    },
    {
      id: "insight-capacity",
      title: "December capacity needs a closer look",
      category: "Operations",
      change: "Action suggested",
      tone: "warning",
      summary:
        "The separate December scheduling scenario contains an over-capacity day and a blackout-date conflict. Preview a move before applying it locally.",
      facts: [
        "The scheduling scenario starts December 1, 2026.",
        "Default daily capacity is 10 orders, with a 2-day lead time.",
        "December 25 is a blackout date.",
      ],
      recommendation:
        "Open Scheduling, select an unresolved order, and preview an available fulfillment date. Billing and estimated delivery dates remain separately labeled.",
      reportId: "subscription-health",
      questions: [
        {
          question: "Will rescheduling change real orders?",
          answer:
            "No. Applying a proposal only changes the sample order in this browser and records local activity.",
        },
        {
          question: "Why are the dates in December?",
          answer:
            "Scheduling uses a fixed future scenario. Analytics stays anchored to September 27, 2026 so the demo remains reproducible.",
        },
      ],
      saved: false,
    },
    {
      id: "insight-products",
      title: "Product mix gives revenue more context",
      category: "Products",
      change: "Explore",
      tone: "neutral",
      summary:
        "Product prices and quantities differ in the sample catalog. A larger revenue contribution does not by itself imply stronger retention or margin.",
      facts: [
        "The same five product IDs connect orders, reports, and purchase settings.",
        "Rankings sum net product line revenue in the selected period.",
        "No cost-of-goods or profit data is included.",
      ],
      recommendation:
        "Compare units and order counts in Product performance. Use this as an investigation prompt rather than a causal diagnosis.",
      reportId: "product-performance",
      questions: [
        {
          question: "How are products ranked?",
          answer:
            "By net line revenue after proportionally allocating each order refund across its lines. Ties use product name.",
        },
        {
          question: "Can I inspect purchase settings?",
          answer:
            "Yes. Select a product in Analytics or Products to open its local purchase-options editor.",
        },
      ],
      saved: false,
    },
  ];
}
export function createInitialState(): DemoState {
  const orders = createOrders();
  // Future-scenario contracts have one planned occurrence each, distinct from the historical cohort.
  const futureContracts: Subscription[] = orders
    .filter((order) => order.id.startsWith("schedule-"))
    .map((order) => ({
      id: order.subscriptionId!,
      customer: order.customer,
      productId: order.lines[0].productId,
      status: "Active",
      frequency: "Monthly",
      nextDate: order.fulfillmentDate,
      startedDate: "2026-11-01",
    }));
  return {
    schemaVersion: 1,
    revision: 0,
    writerId: "",
    snapshot: SNAPSHOT,
    timezone: "America/New_York",
    products: PRODUCTS.map((product) => ({ ...product })),
    orders,
    subscriptions: [...createSubscriptions(), ...futureContracts],
    purchaseDrafts: Object.fromEntries(
      PRODUCTS.map((p) => [p.id, structuredClone(DEFAULT_PURCHASE)]),
    ),
    purchaseApplied: Object.fromEntries(
      PRODUCTS.map((p) => [p.id, structuredClone(DEFAULT_PURCHASE)]),
    ),
    scheduleRules: {
      capacity: 10,
      leadDays: 2,
      blackoutDates: ["2026-12-25"],
      weekendBlackout: false,
    },
    scheduleProposal: null,
    reports: initialReports(),
    automations: initialAutomations(),
    insights: initialInsights(),
    tasks: [],
    savedViews: [],
    activity: [],
    cart: [],
    preferences: { compactRows: false, reducedMotion: false },
  };
}
