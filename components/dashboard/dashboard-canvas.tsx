"use client";

import * as React from "react";
import { useQueries } from "@tanstack/react-query";
import { GridLayout, useContainerWidth, type LayoutItem } from "react-grid-layout";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";
import { X, GripVertical, Pencil, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ChartRenderer } from "@/components/viz/chart-renderer";
import { DataTable } from "@/components/data/data-table";
import type { ChartType } from "@/lib/viz/inference";
import type { QueryResponse } from "@/lib/types/api";

export interface DashboardPanelData {
  id: string;
  chartType: string;
  title: string;
  description: string | null;
  sql: string;
  config: Record<string, unknown>;
  layout: { x: number; y: number; w: number; h: number };
}

interface DashboardCanvasProps {
  panels: DashboardPanelData[];
  dataSourceId?: string;
  onLayoutChange: (layouts: LayoutItem[]) => void;
  onRemovePanel: (id: string) => void;
  onRenamePanel: (id: string, title: string) => void;
}

function EditableTitle({
  value,
  onSave,
}: {
  value: string;
  onSave: (title: string) => void;
}): React.ReactElement {
  const [editing, setEditing] = React.useState(false);
  const [draft, setDraft] = React.useState(value);
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing]);

  function commit(): void {
    const trimmed = draft.trim();
    if (trimmed && trimmed !== value) {
      onSave(trimmed);
    } else {
      setDraft(value);
    }
    setEditing(false);
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit();
          if (e.key === "Escape") {
            setDraft(value);
            setEditing(false);
          }
        }}
        className="bg-transparent text-sm font-medium outline-none border-b border-muted-foreground/40 w-full min-w-0"
        onMouseDown={(e) => e.stopPropagation()}
      />
    );
  }

  return (
    <button
      type="button"
      className="group flex items-center gap-1 text-sm font-medium truncate text-left min-w-0"
      onClick={() => {
        setDraft(value);
        setEditing(true);
      }}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <span className="truncate">{value}</span>
      <Pencil className="size-3 shrink-0 opacity-0 group-hover:opacity-50 transition-opacity" />
    </button>
  );
}

export function DashboardCanvas({
  panels,
  dataSourceId,
  onLayoutChange,
  onRemovePanel,
  onRenamePanel,
}: DashboardCanvasProps): React.ReactElement {
  const panelQueries = useQueries({
    queries: panels.map((panel) => ({
      queryKey: ["panel-data", panel.id, panel.sql],
      queryFn: async () => {
        const res = await fetch("/api/query", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            dataSourceId: dataSourceId ?? "default",
            sql: panel.sql,
          }),
        });
        if (!res.ok) {
          const err = (await res.json()) as { error?: string };
          throw new Error(err.error ?? "Query failed");
        }
        return res.json() as Promise<QueryResponse>;
      },
      staleTime: Infinity,
    })),
  });

  const panelDataMap = React.useMemo(() => {
    const map: Record<string, { status: "loading" | "error" | "loaded"; data?: QueryResponse; message?: string }> = {};
    panels.forEach((panel, i) => {
      const query = panelQueries[i];
      if (query.isLoading) {
        map[panel.id] = { status: "loading" };
      } else if (query.isError) {
        map[panel.id] = { status: "error", message: query.error instanceof Error ? query.error.message : "Query failed" };
      } else if (query.data) {
        map[panel.id] = { status: "loaded", data: query.data };
      } else {
        map[panel.id] = { status: "loading" };
      }
    });
    return map;
  }, [panels, panelQueries]);

  const layouts: LayoutItem[] = panels.map((panel) => ({
    i: panel.id,
    x: panel.layout.x,
    y: panel.layout.y,
    w: panel.layout.w,
    h: panel.layout.h,
    minW: 3,
    minH: 2,
  }));

  function handleLayoutChange(layout: readonly LayoutItem[]): void {
    onLayoutChange([...layout]);
  }

  const { containerRef, width, mounted } = useContainerWidth();

  return (
    <div ref={containerRef}>
    {mounted && (
    <GridLayout
      className="layout"
      width={width}
      layout={layouts}
      gridConfig={{ cols: 12, rowHeight: 80 }}
      dragConfig={{ handle: ".drag-handle" }}
      onLayoutChange={handleLayoutChange}
    >
      {panels.map((panel) => {
        const cached = panelDataMap[panel.id];
        return (
          <div key={panel.id}>
            <Card className="h-full flex flex-col overflow-hidden">
              <CardHeader className="drag-handle cursor-grab pb-2 flex-row items-center justify-between space-y-0 active:cursor-grabbing">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <GripVertical className="size-4 shrink-0 text-muted-foreground" />
                  <EditableTitle
                    value={panel.title}
                    onSave={(title) => onRenamePanel(panel.id, title)}
                  />
                </div>
                <div className="flex items-center shrink-0">
                  {panel.description && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            type="button"
                            className="size-6 inline-flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                            onMouseDown={(e) => e.stopPropagation()}
                          >
                            <Info className="size-3" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-64">
                          {panel.description}
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-6"
                    onClick={() => onRemovePanel(panel.id)}
                  >
                    <X className="size-3" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="flex-1 min-h-0 overflow-hidden">
                {!cached || cached.status === "loading" ? (
                  <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                    Loading...
                  </div>
                ) : cached.status === "error" ? (
                  <div className="flex h-full items-center justify-center text-sm text-destructive">
                    {cached.message}
                  </div>
                ) : panel.chartType === "table" ? (
                  <DataTable data={cached.data!} />
                ) : (
                  <div className="h-full w-full">
                    <ChartRenderer
                      data={cached.data!}
                      chartType={panel.chartType as ChartType}
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        );
      })}
    </GridLayout>
    )}
    </div>
  );
}
