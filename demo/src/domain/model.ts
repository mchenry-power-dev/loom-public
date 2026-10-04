/** Independently authored public demo types. All commerce records are synthetic. */
export type ISODate = string;
export type Period = "7d" | "30d" | "90d";
export type Frequency =
  "2 weeks" | "4 weeks" | "Monthly" | "6 weeks" | "8 weeks";
export type OrderType = "Subscription" | "One-time";
export type PaymentStatus = "Paid" | "Pending" | "Failed" | "Refunded";
export type FulfillmentStatus =
  "Unfulfilled" | "Scheduled" | "Fulfilled" | "Cancelled";
export type ReleaseStatus =
  "Needs review" | "Ready" | "Released" | "Complete" | "Blocked";
export interface Product {
  id: string;
  name: string;
  subtitle: string;
  priceCents: number;
  color: string;
  category: string;
}
export interface PurchaseConfig {
  oneTime: boolean;
  subscription: boolean;
  discount: number;
  frequencies: Frequency[];
  defaultFrequency: Frequency;
  benefits: string[];
  prepaid: { enabled: boolean; deliveries: number; discount: number };
}
export interface OrderLine {
  productId: string;
  quantity: number;
  unitPriceCents: number;
}
export interface Order {
  id: string;
  number: string;
  customer: string;
  date: ISODate;
  type: OrderType;
  payment: PaymentStatus;
  fulfillment: FulfillmentStatus;
  release: ReleaseStatus;
  lines: OrderLine[];
  refundCents: number;
  subscriptionId?: string;
  billingDate: ISODate;
  fulfillmentDate: ISODate;
  deliveryDate: ISODate;
  attention?: string;
}
export interface Subscription {
  id: string;
  customer: string;
  productId: string;
  status: "Active" | "Paused" | "Cancelled";
  frequency: Frequency;
  nextDate: ISODate;
  startedDate: ISODate;
  cancellationReason?: string;
  cancelledDate?: ISODate;
}
export type MetricId =
  | "netRevenue"
  | "orders"
  | "aov"
  | "subscriptionRevenue"
  | "refundRate"
  | "retention";
export type VisualType = "line" | "bar" | "table" | "cards";
export interface ReportVisual {
  id: string;
  type: VisualType;
  metrics: MetricId[];
  title: string;
}
export interface Report {
  id: string;
  name: string;
  template: string;
  period: Period;
  compare: boolean;
  grouping: "day" | "week" | "month";
  purpose: string;
  breakdown: "none" | "product" | "type";
  metrics: MetricId[];
  visuals: ReportVisual[];
  updatedAt: string;
}
export type OutputFormat = "PDF" | "PowerPoint" | "Excel" | "AI Summary";
export type Destination = "Email" | "Teams" | "Slack" | "Text";
export interface Automation {
  id: string;
  name: string;
  type: "Report" | "Alert" | "AI briefing";
  reportId: string;
  cadence: "Daily" | "Weekly" | "Monthly" | "On trigger";
  day: number;
  time: string;
  timezone: string;
  formats: OutputFormat[];
  destinations: Destination[];
  recipients: Partial<Record<Destination, string>>;
  message: string;
  summaryInstructions: string;
  summaryInBody: boolean;
  attachments: boolean;
  failureRecipient: string;
  status: "Active" | "Paused";
  folder: string;
  threshold: number;
}
export interface Insight {
  id: string;
  title: string;
  category: string;
  change: string;
  tone: "positive" | "warning" | "neutral";
  summary: string;
  facts: string[];
  recommendation: string;
  reportId: string;
  questions: { question: string; answer: string }[];
  saved: boolean;
}
export interface Task {
  id: string;
  insightId: string;
  title: string;
  context: string;
  status: "todo" | "completed";
  reminderDate: ISODate | null;
  completedAt: string | null;
}
export interface OrderFilters {
  search: string;
  period: Period | "all";
  type: "all" | OrderType;
  payment: "all" | PaymentStatus;
  fulfillment: "all" | FulfillmentStatus;
  release: "all" | ReleaseStatus;
  sort: "date-desc" | "date-asc" | "total-desc" | "total-asc";
}
export interface SavedView {
  id: string;
  name: string;
  filters: OrderFilters;
  columns: string[];
}
export interface ScheduleRules {
  capacity: number;
  leadDays: number;
  blackoutDates: ISODate[];
  weekendBlackout: boolean;
}
export interface ScheduleProposal {
  orderIds: string[];
  date: ISODate;
}
export interface Activity {
  id: string;
  date: string;
  message: string;
}
export interface CartItem {
  id: string;
  productId: string;
  quantity: number;
  type: "one-time" | "subscription" | "prepaid";
  unitPriceCents: number;
  frequency?: Frequency;
}
export interface DemoState {
  schemaVersion: 1;
  revision: number;
  writerId: string;
  snapshot: string;
  timezone: string;
  products: Product[];
  orders: Order[];
  subscriptions: Subscription[];
  purchaseDrafts: Record<string, PurchaseConfig>;
  purchaseApplied: Record<string, PurchaseConfig>;
  scheduleRules: ScheduleRules;
  scheduleProposal: ScheduleProposal | null;
  reports: Report[];
  automations: Automation[];
  insights: Insight[];
  tasks: Task[];
  savedViews: SavedView[];
  activity: Activity[];
  cart: CartItem[];
  preferences: { compactRows: boolean; reducedMotion: boolean };
}
export type DemoAction =
  | { type: "order/release"; id: string }
  | { type: "order/complete"; id: string }
  | { type: "subscription/status"; id: string; status: "Active" | "Paused" }
  | { type: "subscription/skip"; id: string }
  | { type: "subscription/reason"; id: string; reason: string }
  | { type: "purchase/draft"; productId: string; config: PurchaseConfig }
  | { type: "purchase/apply"; productId: string; config?: PurchaseConfig }
  | { type: "cart/add"; item: CartItem }
  | { type: "schedule/rules"; rules: ScheduleRules }
  | { type: "schedule/preview"; proposal: ScheduleProposal }
  | { type: "schedule/cancel" }
  | { type: "schedule/apply" }
  | { type: "view/save"; view: SavedView }
  | { type: "view/delete"; id: string }
  | { type: "report/save"; report: Report }
  | { type: "report/delete"; id: string; replacementId?: string }
  | { type: "automation/save"; automation: Automation }
  | { type: "automation/status"; id: string; status: "Active" | "Paused" }
  | { type: "automation/duplicate"; id: string; newId: string }
  | { type: "automation/delete"; id: string }
  | { type: "automation/test"; id: string }
  | { type: "insight/save"; id: string; saved: boolean }
  | { type: "task/add"; insightId: string }
  | { type: "task/reminder"; insightId: string; date: ISODate | null }
  | { type: "task/status"; insightId: string; status: "todo" | "completed" }
  | {
      type: "preferences/update";
      preferences: Partial<DemoState["preferences"]>;
      timezone?: string;
    }
  | { type: "state/replace"; state: DemoState }
  | { type: "state/reset" };
