"use client";

import * as React from "react";
import {
  BarChart3,
  LineChart,
  PieChart,
  TrendingUp,
  Activity,
  Table as TableIcon,
  Pin,
  ChevronDown,
  Code,
  Info,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChartRenderer } from "@/components/viz/chart-renderer";
import { DataTable } from "@/components/data/data-table";
import { SqlPreview } from "@/components/data/sql-preview";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { inferChartType, type ChartType } from "@/lib/viz/inference";
import type { QueryResponse } from "@/lib/types/api";

interface ChartCardProps {
  data: QueryResponse;
  sql: string;
  title?: string;
  description?: string;
  onPin?: (chartType: ChartType, sql: string) => void;
}

const chartIcons: Record<ChartType, React.ElementType> = {
  bar: BarChart3,
  line: LineChart,
  pie: PieChart,
  scatter: TrendingUp,
  area: Activity,
  table: TableIcon,
};

const chartLabels: Record<ChartType, string> = {
  bar: "Bar",
  line: "Line",
  pie: "Pie",
  scatter: "Scatter",
  area: "Area",
  table: "Table",
};

const ALL_CHART_TYPES: ChartType[] = [
  "bar",
  "line",
  "pie",
  "scatter",
  "area",
  "table",
];

export function ChartCard({
  data,
  sql,
  title,
  description,
  onPin,
}: ChartCardProps): React.ReactElement {
  const [chartType, setChartType] = React.useState<ChartType>(() =>
    inferChartType(data),
  );
  const [showSql, setShowSql] = React.useState(false);

  const ActiveIcon = chartIcons[chartType];

  return (
    <Card className="w-full py-3 gap-1">
      <div className="flex items-center justify-end gap-1 px-4 pb-0">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="xs" className="gap-1">
              <ActiveIcon className="size-3" />
              {chartLabels[chartType]}
              <ChevronDown className="size-3 opacity-50" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {ALL_CHART_TYPES.map((type) => {
              const Icon = chartIcons[type];
              return (
                <DropdownMenuItem
                  key={type}
                  onClick={() => setChartType(type)}
                  className="gap-2 text-xs"
                >
                  <Icon className="size-3.5" />
                  {chartLabels[type]}
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>
        <Button
          variant="ghost"
          size="icon-xs"
          onClick={() => setShowSql((prev) => !prev)}
          aria-label="Toggle SQL"
        >
          <Code className="size-3" />
        </Button>
        {onPin && (
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={() => onPin(chartType, sql)}
            aria-label="Pin to dashboard"
          >
            <Pin className="size-3" />
          </Button>
        )}
      </div>
      <div className="px-6 pt-0 pb-2">
        <div className="flex items-center gap-1.5 text-sm font-semibold leading-none">
          {title ?? "Query Result"}
          {description && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="size-3.5 text-muted-foreground cursor-help shrink-0" />
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-xs">
                  <p className="text-xs">{description}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      </div>
      <CardContent>
        {showSql && (
          <div className="mb-3">
            <SqlPreview sql={sql} />
          </div>
        )}
        {chartType === "table" ? (
          <DataTable data={data} />
        ) : (
          <div className="h-[300px]">
            <ChartRenderer data={data} chartType={chartType} />
          </div>
        )}
        <div className="mt-2 text-xs text-muted-foreground">
          {data.rowCount} row{data.rowCount !== 1 ? "s" : ""} returned
        </div>
      </CardContent>
    </Card>
  );
}
