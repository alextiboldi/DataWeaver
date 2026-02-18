"use client";

import { Renderer, JSONUIProvider } from "@json-render/react";
import { chatRegistry } from "@/lib/render/registry";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import type { Spec } from "@json-render/core";
import {
  SHOWCASES,
  CATEGORY_DATA,
  REVENUE_DATA,
  TABLE_COLUMNS,
  TABLE_ROWS,
  spec,
} from "@/lib/render/showcase-data";

// ── Additional showcases only for this page ─────────────────────────

const EXTRA_SHOWCASES = [
  {
    name: "Heading",
    description: "Section headings at 3 levels",
    spec: spec({
      main: { type: "Stack", props: { direction: "vertical", gap: "sm" }, children: ["h1", "h2", "h3"] },
      h1: { type: "Heading", props: { text: "Level 1 Heading", level: "1" } },
      h2: { type: "Heading", props: { text: "Level 2 Heading", level: "2" } },
      h3: { type: "Heading", props: { text: "Level 3 Heading", level: "3" } },
    }),
  },
  {
    name: "Text",
    description: "Body text for descriptions and context",
    spec: spec({
      main: { type: "Text", props: { content: "This is a body text component used for descriptions, explanations, and contextual information within rendered layouts." } },
    }),
  },
  {
    name: "Stack (Vertical)",
    description: "Vertical layout container with gap control",
    spec: spec({
      main: { type: "Stack", props: { direction: "vertical", gap: "md" }, children: ["t", "m"] },
      t: { type: "Heading", props: { text: "Vertical Stack", level: "3" } },
      m: { type: "MetricCard", props: { label: "Stacked Item", value: "42" } },
    }),
  },
  {
    name: "Stack (Horizontal)",
    description: "Horizontal layout for side-by-side elements",
    spec: spec({
      main: { type: "Stack", props: { direction: "horizontal", gap: "md" }, children: ["m1", "m2"] },
      m1: { type: "MetricCard", props: { label: "Metric A", value: "$1.2M", change: "+8%", changeType: "positive" } },
      m2: { type: "MetricCard", props: { label: "Metric B", value: "94%", change: "-2%", changeType: "negative" } },
    }),
  },
  {
    name: "Grid",
    description: "Multi-column grid layout (2, 3, or 4 columns)",
    spec: spec({
      main: { type: "Grid", props: { columns: "4" }, children: ["m1", "m2", "m3", "m4"] },
      m1: { type: "MetricCard", props: { label: "Q1", value: "$8.2M" } },
      m2: { type: "MetricCard", props: { label: "Q2", value: "$9.1M" } },
      m3: { type: "MetricCard", props: { label: "Q3", value: "$7.8M" } },
      m4: { type: "MetricCard", props: { label: "Q4", value: "$10.4M" } },
    }),
  },
];

const ALL_SHOWCASES = [...SHOWCASES, ...EXTRA_SHOWCASES];

// ── Composed example ────────────────────────────────────────────────

const DASHBOARD_SPEC = spec({
  main: { type: "Stack", props: { direction: "vertical", gap: "md" }, children: ["title", "metrics", "charts", "table"] },
  title: { type: "Heading", props: { text: "Q1 2026 Sales Dashboard", level: "1" } },
  metrics: { type: "Grid", props: { columns: "3" }, children: ["m1", "m2", "m3"] },
  m1: { type: "MetricCard", props: { label: "Total Revenue", value: "$34.8K", change: "+12.3%", changeType: "positive" } },
  m2: { type: "MetricCard", props: { label: "Orders", value: "847", change: "+5.2%", changeType: "positive" } },
  m3: { type: "MetricCard", props: { label: "Avg Order", value: "$41.10", change: "-1.8%", changeType: "negative" } },
  charts: { type: "Grid", props: { columns: "2" }, children: ["bar", "line"] },
  bar: { type: "BarChart", props: { data: CATEGORY_DATA, xKey: "category", yKeys: ["sales"], title: "Sales by Category" } },
  line: { type: "LineChart", props: { data: REVENUE_DATA, xKey: "month", yKeys: ["revenue", "expenses"], title: "Monthly Trends" } },
  table: { type: "DataTable", props: { columns: TABLE_COLUMNS, rows: TABLE_ROWS, title: "Recent Orders" } },
});

// ── Page component ──────────────────────────────────────────────────

function RendererCard({ name, description, renderSpec }: { name: string; description: string; renderSpec: Spec }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <Badge variant="outline" className="font-mono text-xs">
          {name}
        </Badge>
        <span className="text-sm text-muted-foreground">{description}</span>
      </div>
      <Card className="p-6">
        <JSONUIProvider registry={chatRegistry}>
          <Renderer spec={renderSpec} registry={chatRegistry} />
        </JSONUIProvider>
      </Card>
    </div>
  );
}

export default function ComponentsPage() {
  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-5xl space-y-8 p-8">
        <div>
          <h1 className="text-xl font-black uppercase tracking-tight">Component Registry</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            All available json-render components for the chat UI. These are composed by the AI agent via the renderUI tool.
          </p>
        </div>

        <Separator className="border-black" />

        <div>
          <h2 className="text-lg font-bold tracking-tight">Individual Components</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Each component rendered standalone with sample data.
          </p>
        </div>

        <div className="space-y-10">
          {ALL_SHOWCASES.map((item) => (
            <RendererCard key={item.name} name={item.name} description={item.description} renderSpec={item.spec} />
          ))}
        </div>

        <Separator className="border-black" />

        <div>
          <h2 className="text-lg font-bold tracking-tight">Composed Dashboard</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            A full dashboard layout composing MetricCards, Charts, and a DataTable using Stack and Grid containers.
          </p>
        </div>

        <Card className="p-6">
          <JSONUIProvider registry={chatRegistry}>
            <Renderer spec={DASHBOARD_SPEC} registry={chatRegistry} />
          </JSONUIProvider>
        </Card>

        <div className="pb-8" />
      </div>
    </div>
  );
}
