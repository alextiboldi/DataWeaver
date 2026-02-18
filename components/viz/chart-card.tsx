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
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChartRenderer } from "@/components/viz/chart-renderer";
import { DataTable } from "@/components/data/data-table";
import { SqlPreview } from "@/components/data/sql-preview";
import { inferChartType, type ChartType } from "@/lib/viz/inference";
import type { QueryResponse } from "@/lib/types/api";

interface ChartCardProps {
  data: QueryResponse;
  sql: string;
  title?: string;
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
  onPin,
}: ChartCardProps): React.ReactElement {
  const [chartType, setChartType] = React.useState<ChartType>(() =>
    inferChartType(data),
  );
  const [showSql, setShowSql] = React.useState(false);

  return (
    <Card className="w-full">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-sm font-medium">
            {title ?? "Query Result"}
          </CardTitle>
          <div className="flex items-center gap-1">
            {onPin && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onPin(chartType, sql)}
                className="h-7 gap-1 text-xs"
              >
                <Pin className="size-3" />
                Pin
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowSql((prev) => !prev)}
              className="h-7 text-xs"
            >
              {showSql ? "Hide SQL" : "SQL"}
            </Button>
          </div>
        </div>
        <Tabs
          value={chartType}
          onValueChange={(val) => setChartType(val as ChartType)}
        >
          <TabsList className="h-8">
            {ALL_CHART_TYPES.map((type) => {
              const Icon = chartIcons[type];
              return (
                <TabsTrigger
                  key={type}
                  value={type}
                  className="h-7 gap-1 px-2 text-xs"
                >
                  <Icon className="size-3" />
                  {chartLabels[type]}
                </TabsTrigger>
              );
            })}
          </TabsList>
        </Tabs>
      </CardHeader>
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
