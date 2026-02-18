import type { Spec } from "@json-render/core";

// ── Sample data ─────────────────────────────────────────────────────

export const REVENUE_DATA = [
  { month: "Jan", revenue: 4200, expenses: 2800 },
  { month: "Feb", revenue: 3800, expenses: 2600 },
  { month: "Mar", revenue: 5100, expenses: 3200 },
  { month: "Apr", revenue: 4700, expenses: 2900 },
  { month: "May", revenue: 5800, expenses: 3500 },
  { month: "Jun", revenue: 6200, expenses: 3100 },
];

export const CATEGORY_DATA = [
  { category: "Electronics", sales: 12400 },
  { category: "Clothing", sales: 8200 },
  { category: "Food", sales: 6800 },
  { category: "Books", sales: 4300 },
  { category: "Sports", sales: 3100 },
];

export const PIE_DATA = [
  { segment: "Enterprise", value: 45 },
  { segment: "SMB", value: 30 },
  { segment: "Startup", value: 15 },
  { segment: "Individual", value: 10 },
];

export const SCATTER_DATA = [
  { adSpend: 200, conversions: 12 },
  { adSpend: 450, conversions: 28 },
  { adSpend: 800, conversions: 45 },
  { adSpend: 1200, conversions: 52 },
  { adSpend: 350, conversions: 18 },
  { adSpend: 600, conversions: 35 },
  { adSpend: 950, conversions: 48 },
  { adSpend: 1500, conversions: 61 },
  { adSpend: 100, conversions: 5 },
  { adSpend: 700, conversions: 38 },
];

export const TABLE_COLUMNS = [
  { name: "id" },
  { name: "customer" },
  { name: "amount" },
  { name: "status" },
  { name: "date" },
];

export const TABLE_ROWS = [
  { id: "ORD-001", customer: "Acme Corp", amount: "$2,340", status: "Completed", date: "2026-02-10" },
  { id: "ORD-002", customer: "Globex Inc", amount: "$1,890", status: "Pending", date: "2026-02-12" },
  { id: "ORD-003", customer: "Initech", amount: "$4,100", status: "Completed", date: "2026-02-14" },
  { id: "ORD-004", customer: "Umbrella Co", amount: "$960", status: "Cancelled", date: "2026-02-15" },
  { id: "ORD-005", customer: "Stark Ind", amount: "$7,250", status: "Completed", date: "2026-02-16" },
];

// ── Spec builder ────────────────────────────────────────────────────

export function spec(
  elements: Record<string, { type: string; props: Record<string, unknown>; children?: string[] }>,
  root = "main"
): Spec {
  const normalized: Record<string, Record<string, unknown>> = {};
  for (const [key, el] of Object.entries(elements)) {
    normalized[key] = { ...el, children: el.children ?? [] };
  }
  return { root, elements: normalized } as unknown as Spec;
}

// ── Showcase specs ──────────────────────────────────────────────────

export interface ShowcaseItem {
  name: string;
  description: string;
  spec: Spec;
}

export const SHOWCASES: ShowcaseItem[] = [
  {
    name: "MetricCard",
    description: "KPI cards with value, label, and optional change indicator",
    spec: spec({
      main: { type: "Grid", props: { columns: "3" }, children: ["m1", "m2", "m3"] },
      m1: { type: "MetricCard", props: { label: "Total Revenue", value: "$34.8K", change: "+12.3%", changeType: "positive" } },
      m2: { type: "MetricCard", props: { label: "Active Users", value: "2,847", change: "-3.1%", changeType: "negative" } },
      m3: { type: "MetricCard", props: { label: "Avg Order Value", value: "$128", change: "0%", changeType: "neutral" } },
    }),
  },
  {
    name: "BarChart",
    description: "Categorical comparisons with grouped bars",
    spec: spec({
      main: { type: "BarChart", props: { data: CATEGORY_DATA, xKey: "category", yKeys: ["sales"], title: "Sales by Category" } },
    }),
  },
  {
    name: "LineChart",
    description: "Trends over time with multiple series",
    spec: spec({
      main: { type: "LineChart", props: { data: REVENUE_DATA, xKey: "month", yKeys: ["revenue", "expenses"], title: "Monthly Trends" } },
    }),
  },
  {
    name: "AreaChart",
    description: "Cumulative or stacked trends",
    spec: spec({
      main: { type: "AreaChart", props: { data: REVENUE_DATA, xKey: "month", yKeys: ["revenue"], title: "Revenue Over Time" } },
    }),
  },
  {
    name: "PieChart",
    description: "Part-to-whole proportional data",
    spec: spec({
      main: { type: "PieChart", props: { data: PIE_DATA, nameKey: "segment", valueKey: "value", title: "Revenue by Segment" } },
    }),
  },
  {
    name: "ScatterChart",
    description: "Correlation between two numeric variables",
    spec: spec({
      main: { type: "ScatterChart", props: { data: SCATTER_DATA, xKey: "adSpend", yKey: "conversions", title: "Ad Spend vs Conversions" } },
    }),
  },
  {
    name: "DataTable",
    description: "Tabular data display with row count",
    spec: spec({
      main: { type: "DataTable", props: { columns: TABLE_COLUMNS, rows: TABLE_ROWS, title: "Recent Orders" } },
    }),
  },
  {
    name: "Dashboard",
    description: "Composed layout with MetricCards + Charts",
    spec: spec({
      main: { type: "Stack", props: { direction: "vertical", gap: "md" }, children: ["heading", "metrics", "chart"] },
      heading: { type: "Heading", props: { text: "Q1 Revenue Overview", level: "2" } },
      metrics: { type: "Grid", props: { columns: "2" }, children: ["m1", "m2"] },
      m1: { type: "MetricCard", props: { label: "Total", value: "$34.8K", change: "+12%", changeType: "positive" } },
      m2: { type: "MetricCard", props: { label: "Orders", value: "847", change: "+5%", changeType: "positive" } },
      chart: { type: "BarChart", props: { data: CATEGORY_DATA, xKey: "category", yKeys: ["sales"], title: "By Category" } },
    }),
  },
];
