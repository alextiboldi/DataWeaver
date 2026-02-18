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
import { defineRegistry } from "@json-render/react";
import { chatCatalog } from "./catalog";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const CHART_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

const TOOLTIP_STYLE = {
  backgroundColor: "oklch(var(--popover))",
  border: "1px solid oklch(var(--border))",
  borderRadius: "var(--radius)",
  fontSize: 12,
};

const GAP_MAP = { sm: "gap-2", md: "gap-4", lg: "gap-6" } as const;

export const { registry: chatRegistry } = defineRegistry(chatCatalog, {
  components: {
    Stack: ({ props, children }) => {
      const dir =
        props.direction === "horizontal" ? "flex-row" : "flex-col";
      const gap = GAP_MAP[props.gap ?? "md"];
      return <div className={`flex ${dir} ${gap}`}>{children}</div>;
    },

    Grid: ({ props, children }) => {
      const colClass = {
        "2": "grid-cols-2",
        "3": "grid-cols-3",
        "4": "grid-cols-4",
      }[props.columns ?? "2"];
      return <div className={`grid ${colClass} gap-4`}>{children}</div>;
    },

    Heading: ({ props }) => {
      const Tag = (`h${props.level ?? "2"}`) as "h1" | "h2" | "h3";
      const sizeClass = {
        "1": "text-xl font-black uppercase tracking-tight",
        "2": "text-lg font-bold tracking-tight",
        "3": "text-sm font-bold uppercase tracking-wide",
      }[props.level ?? "2"];
      return <Tag className={sizeClass}>{props.text}</Tag>;
    },

    Text: ({ props }) => (
      <p className="text-sm text-muted-foreground">{props.content}</p>
    ),

    MetricCard: ({ props }) => {
      const changeColor =
        props.changeType === "positive"
          ? "text-emerald-600 dark:text-emerald-400"
          : props.changeType === "negative"
            ? "text-red-600 dark:text-red-400"
            : "text-muted-foreground";
      return (
        <Card className="p-4 border-2">
          <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {props.label}
          </div>
          <div className="mt-1 text-2xl font-black">{props.value}</div>
          {props.change && (
            <div className={`mt-1 text-xs font-medium ${changeColor}`}>
              {props.change}
            </div>
          )}
        </Card>
      );
    },

    BarChart: ({ props }) => {
      const data = props.data as Record<string, unknown>[];
      return (
        <ChartWrapper title={props.title}>
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis
                dataKey={props.xKey}
                tick={{ fontSize: 12 }}
                className="fill-muted-foreground"
              />
              <YAxis tick={{ fontSize: 12 }} className="fill-muted-foreground" />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              {props.yKeys.map((key, i) => (
                <Bar
                  key={key}
                  dataKey={key}
                  fill={CHART_COLORS[i % CHART_COLORS.length]}
                  radius={[4, 4, 0, 0]}
                />
              ))}
              {props.yKeys.length > 1 && <Legend />}
            </BarChart>
          </ResponsiveContainer>
        </ChartWrapper>
      );
    },

    LineChart: ({ props }) => (
      <ChartWrapper title={props.title}>
        <ResponsiveContainer width="100%" height={350}>
          <LineChart data={props.data as Record<string, unknown>[]}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis
              dataKey={props.xKey}
              tick={{ fontSize: 12 }}
              className="fill-muted-foreground"
            />
            <YAxis tick={{ fontSize: 12 }} className="fill-muted-foreground" />
            <Tooltip contentStyle={TOOLTIP_STYLE} />
            {props.yKeys.map((key, i) => (
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
            {props.yKeys.length > 1 && <Legend />}
          </LineChart>
        </ResponsiveContainer>
      </ChartWrapper>
    ),

    AreaChart: ({ props }) => (
      <ChartWrapper title={props.title}>
        <ResponsiveContainer width="100%" height={350}>
          <AreaChart data={props.data as Record<string, unknown>[]}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis
              dataKey={props.xKey}
              tick={{ fontSize: 12 }}
              className="fill-muted-foreground"
            />
            <YAxis tick={{ fontSize: 12 }} className="fill-muted-foreground" />
            <Tooltip contentStyle={TOOLTIP_STYLE} />
            {props.yKeys.map((key, i) => (
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
            {props.yKeys.length > 1 && <Legend />}
          </AreaChart>
        </ResponsiveContainer>
      </ChartWrapper>
    ),

    PieChart: ({ props }) => (
      <ChartWrapper title={props.title}>
        <ResponsiveContainer width="100%" height={350}>
          <PieChart>
            <Pie
              data={props.data as Record<string, unknown>[]}
              dataKey={props.valueKey}
              nameKey={props.nameKey}
              cx="50%"
              cy="50%"
              outerRadius={120}
              innerRadius={60}
              paddingAngle={2}
              label={(entry: { name?: string; percent?: number }) =>
                `${entry.name ?? ""} ${((entry.percent ?? 0) * 100).toFixed(0)}%`
              }
            >
              {(props.data as Record<string, unknown>[]).map((_, i) => (
                <Cell
                  key={`cell-${i}`}
                  fill={CHART_COLORS[i % CHART_COLORS.length]}
                />
              ))}
            </Pie>
            <Tooltip contentStyle={TOOLTIP_STYLE} />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </ChartWrapper>
    ),

    ScatterChart: ({ props }) => (
      <ChartWrapper title={props.title}>
        <ResponsiveContainer width="100%" height={350}>
          <ScatterChart>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis
              dataKey={props.xKey}
              name={props.xKey}
              tick={{ fontSize: 12 }}
              className="fill-muted-foreground"
            />
            <YAxis
              dataKey={props.yKey}
              name={props.yKey}
              tick={{ fontSize: 12 }}
              className="fill-muted-foreground"
            />
            <Tooltip
              cursor={{ strokeDasharray: "3 3" }}
              contentStyle={TOOLTIP_STYLE}
            />
            <Scatter
              data={props.data as Record<string, unknown>[]}
              fill={CHART_COLORS[0]}
            />
          </ScatterChart>
        </ResponsiveContainer>
      </ChartWrapper>
    ),

    DataTable: ({ props }) => {
      const columns = props.columns;
      const rows = props.rows as Record<string, unknown>[];
      return (
        <div className="space-y-2">
          {props.title && (
            <div className="text-sm font-bold">{props.title}</div>
          )}
          <div className="overflow-hidden rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  {columns.map((col) => (
                    <TableHead key={col.name}>{col.name}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length > 0 ? (
                  rows.map((row, rowIdx) => (
                    <TableRow key={rowIdx}>
                      {columns.map((col) => (
                        <TableCell key={col.name} className="font-mono text-sm">
                          {row[col.name] === null ? (
                            <span className="text-muted-foreground">null</span>
                          ) : (
                            String(row[col.name])
                          )}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={columns.length}
                      className="h-24 text-center"
                    >
                      No results.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          <div className="text-xs text-muted-foreground">
            {rows.length} row{rows.length !== 1 ? "s" : ""}
          </div>
        </div>
      );
    },
  },
});

function ChartWrapper({
  title,
  children,
}: {
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      {title && <div className="text-sm font-bold">{title}</div>}
      <div className="w-full" style={{ minHeight: 350 }}>
        {children}
      </div>
    </div>
  );
}
