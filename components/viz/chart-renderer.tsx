"use client";

import * as React from "react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  ScatterChart,
  Scatter,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import type { QueryResponse } from "@/lib/types/api";
import type { ChartType } from "@/lib/viz/inference";

interface ChartRendererProps {
  data: QueryResponse;
  chartType: ChartType;
}

const CHART_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

function getColumnsByKind(columns: QueryResponse["columns"]): {
  categorical: string[];
  numeric: string[];
  date: string[];
} {
  const categorical: string[] = [];
  const numeric: string[] = [];
  const date: string[] = [];

  for (const col of columns) {
    const t = col.type.toLowerCase();
    if (
      t === "integer" ||
      t === "int" ||
      t === "bigint" ||
      t === "smallint" ||
      t === "decimal" ||
      t === "numeric" ||
      t === "real" ||
      t === "double precision" ||
      t === "float" ||
      t === "money" ||
      t === "serial" ||
      t === "bigserial"
    ) {
      numeric.push(col.name);
    } else if (
      t === "date" ||
      t === "timestamp" ||
      t === "timestamp with time zone" ||
      t === "timestamp without time zone" ||
      t === "timestamptz" ||
      t === "time" ||
      t === "interval"
    ) {
      date.push(col.name);
    } else {
      categorical.push(col.name);
    }
  }

  return { categorical, numeric, date };
}

function RenderBarChart({
  data,
}: {
  data: QueryResponse;
}): React.ReactElement {
  const { categorical, numeric } = getColumnsByKind(data.columns);
  const xKey = categorical[0] ?? data.columns[0]?.name ?? "x";

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data.rows}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
        <XAxis
          dataKey={xKey}
          tick={{ fontSize: 12 }}
          className="fill-muted-foreground"
        />
        <YAxis tick={{ fontSize: 12 }} className="fill-muted-foreground" />
        <Tooltip
          contentStyle={{
            backgroundColor: "oklch(var(--popover))",
            border: "1px solid oklch(var(--border))",
            borderRadius: "var(--radius)",
            fontSize: 12,
          }}
        />
        {numeric.map((key, i) => (
          <Bar
            key={key}
            dataKey={key}
            fill={CHART_COLORS[i % CHART_COLORS.length]}
            radius={[4, 4, 0, 0]}
          />
        ))}
        {numeric.length > 1 && <Legend />}
      </BarChart>
    </ResponsiveContainer>
  );
}

function RenderLineChart({
  data,
}: {
  data: QueryResponse;
}): React.ReactElement {
  const { numeric, date, categorical } = getColumnsByKind(data.columns);
  const xKey = date[0] ?? categorical[0] ?? data.columns[0]?.name ?? "x";

  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data.rows}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
        <XAxis
          dataKey={xKey}
          tick={{ fontSize: 12 }}
          className="fill-muted-foreground"
        />
        <YAxis tick={{ fontSize: 12 }} className="fill-muted-foreground" />
        <Tooltip
          contentStyle={{
            backgroundColor: "oklch(var(--popover))",
            border: "1px solid oklch(var(--border))",
            borderRadius: "var(--radius)",
            fontSize: 12,
          }}
        />
        {numeric.map((key, i) => (
          <Line
            key={key}
            type="monotone"
            dataKey={key}
            stroke={CHART_COLORS[i % CHART_COLORS.length]}
            strokeWidth={2}
            dot={{ r: 3 }}
            activeDot={{ r: 5 }}
          />
        ))}
        {numeric.length > 1 && <Legend />}
      </LineChart>
    </ResponsiveContainer>
  );
}

function RenderPieChart({
  data,
}: {
  data: QueryResponse;
}): React.ReactElement {
  const { categorical, numeric } = getColumnsByKind(data.columns);
  const nameKey = categorical[0] ?? data.columns[0]?.name ?? "name";
  const valueKey = numeric[0] ?? data.columns[1]?.name ?? "value";

  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          data={data.rows}
          dataKey={valueKey}
          nameKey={nameKey}
          cx="50%"
          cy="50%"
          outerRadius="70%"
          innerRadius="35%"
          paddingAngle={2}
          label={({ name, percent }: { name?: string; percent?: number }) =>
            `${name ?? ""} ${((percent ?? 0) * 100).toFixed(0)}%`
          }
        >
          {data.rows.map((_, i) => (
            <Cell
              key={`cell-${i}`}
              fill={CHART_COLORS[i % CHART_COLORS.length]}
            />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{
            backgroundColor: "oklch(var(--popover))",
            border: "1px solid oklch(var(--border))",
            borderRadius: "var(--radius)",
            fontSize: 12,
          }}
        />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
}

function RenderScatterChart({
  data,
}: {
  data: QueryResponse;
}): React.ReactElement {
  const { numeric } = getColumnsByKind(data.columns);
  const xKey = numeric[0] ?? data.columns[0]?.name ?? "x";
  const yKey = numeric[1] ?? data.columns[1]?.name ?? "y";

  return (
    <ResponsiveContainer width="100%" height="100%">
      <ScatterChart>
        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
        <XAxis
          dataKey={xKey}
          name={xKey}
          tick={{ fontSize: 12 }}
          className="fill-muted-foreground"
        />
        <YAxis
          dataKey={yKey}
          name={yKey}
          tick={{ fontSize: 12 }}
          className="fill-muted-foreground"
        />
        <Tooltip
          cursor={{ strokeDasharray: "3 3" }}
          contentStyle={{
            backgroundColor: "oklch(var(--popover))",
            border: "1px solid oklch(var(--border))",
            borderRadius: "var(--radius)",
            fontSize: 12,
          }}
        />
        <Scatter data={data.rows} fill={CHART_COLORS[0]} />
      </ScatterChart>
    </ResponsiveContainer>
  );
}

function RenderAreaChart({
  data,
}: {
  data: QueryResponse;
}): React.ReactElement {
  const { numeric, date, categorical } = getColumnsByKind(data.columns);
  const xKey = date[0] ?? categorical[0] ?? data.columns[0]?.name ?? "x";

  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data.rows}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
        <XAxis
          dataKey={xKey}
          tick={{ fontSize: 12 }}
          className="fill-muted-foreground"
        />
        <YAxis tick={{ fontSize: 12 }} className="fill-muted-foreground" />
        <Tooltip
          contentStyle={{
            backgroundColor: "oklch(var(--popover))",
            border: "1px solid oklch(var(--border))",
            borderRadius: "var(--radius)",
            fontSize: 12,
          }}
        />
        {numeric.map((key, i) => (
          <Area
            key={key}
            type="monotone"
            dataKey={key}
            stroke={CHART_COLORS[i % CHART_COLORS.length]}
            fill={CHART_COLORS[i % CHART_COLORS.length]}
            fillOpacity={0.2}
            strokeWidth={2}
          />
        ))}
        {numeric.length > 1 && <Legend />}
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function ChartRenderer({
  data,
  chartType,
}: ChartRendererProps): React.ReactElement | null {
  switch (chartType) {
    case "bar":
      return <RenderBarChart data={data} />;
    case "line":
      return <RenderLineChart data={data} />;
    case "pie":
      return <RenderPieChart data={data} />;
    case "scatter":
      return <RenderScatterChart data={data} />;
    case "area":
      return <RenderAreaChart data={data} />;
    case "table":
      return null;
  }
}
