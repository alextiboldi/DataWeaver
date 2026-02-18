"use client";

import * as React from "react";
import { use } from "react";
import Link from "next/link";
import type { LayoutItem } from "react-grid-layout";
import { ArrowLeft, Database, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DashboardCanvas,
  type DashboardPanelData,
} from "@/components/dashboard/dashboard-canvas";
import { ChatPanel } from "@/components/chat/chat-panel";

interface DashboardDataSource {
  id: string;
  name: string;
  type: string;
}

interface DashboardDetail {
  id: string;
  title: string;
  panels: DashboardPanelData[];
  dataSource: DashboardDataSource | null;
  dataSourceId: string | null;
}

export default function DashboardDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}): React.ReactElement {
  const { id } = use(params);
  const [dashboard, setDashboard] = React.useState<DashboardDetail | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [sidebarWidth, setSidebarWidth] = React.useState(380);
  const isResizing = React.useRef(false);

  const fetchDashboard = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/dashboards/${id}`);
      if (!res.ok) {
        setError("Dashboard not found");
        return;
      }
      const json = (await res.json()) as { dashboard: DashboardDetail };
      setDashboard(json.dashboard);
    } catch {
      setError("Failed to load dashboard");
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  React.useEffect(() => {
    void fetchDashboard();
  }, [fetchDashboard]);

  const handleMouseDown = React.useCallback(() => {
    isResizing.current = true;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";

    function onMouseMove(e: MouseEvent): void {
      if (!isResizing.current) return;
      const newWidth = Math.min(500, Math.max(280, e.clientX - 264));
      setSidebarWidth(newWidth);
    }

    function onMouseUp(): void {
      isResizing.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    }

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  }, []);

  async function handlePinChart(data: {
    chartType: string;
    sql: string;
    title: string;
  }): Promise<void> {
    if (!data.sql || !data.chartType) return;
    const panelCount = dashboard?.panels.length ?? 0;
    const shortTitle = `${data.chartType.charAt(0).toUpperCase()}${data.chartType.slice(1)} ${panelCount + 1}`;
    const res = await fetch(`/api/dashboards/${id}/panels`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chartType: data.chartType,
        sql: data.sql,
        title: shortTitle,
        description: data.title,
      }),
    });
    if (!res.ok) return;
    const json = (await res.json()) as { panel: DashboardPanelData };
    setDashboard((prev) => {
      if (!prev) return prev;
      return { ...prev, panels: [...prev.panels, json.panel] };
    });
  }

  async function handleLayoutChange(layouts: LayoutItem[]): Promise<void> {
    if (!dashboard) return;

    const updates = layouts.map(async (layout) => {
      const panel = dashboard.panels.find((p) => p.id === layout.i);
      if (!panel) return;

      const newLayout = { x: layout.x, y: layout.y, w: layout.w, h: layout.h };
      if (
        panel.layout.x === newLayout.x &&
        panel.layout.y === newLayout.y &&
        panel.layout.w === newLayout.w &&
        panel.layout.h === newLayout.h
      )
        return;

      await fetch(`/api/dashboards/${id}/panels/${panel.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ layout: newLayout }),
      });
    });

    await Promise.all(updates);

    setDashboard((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        panels: prev.panels.map((panel) => {
          const layout = layouts.find((l) => l.i === panel.id);
          if (!layout) return panel;
          return {
            ...panel,
            layout: { x: layout.x, y: layout.y, w: layout.w, h: layout.h },
          };
        }),
      };
    });
  }

  async function handleRenamePanel(panelId: string, title: string): Promise<void> {
    await fetch(`/api/dashboards/${id}/panels/${panelId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title }),
    });
    setDashboard((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        panels: prev.panels.map((p) =>
          p.id === panelId ? { ...p, title } : p
        ),
      };
    });
  }

  async function handleRemovePanel(panelId: string): Promise<void> {
    await fetch(`/api/dashboards/${id}/panels/${panelId}`, { method: "DELETE" });
    setDashboard((prev) => {
      if (!prev) return prev;
      return { ...prev, panels: prev.panels.filter((p) => p.id !== panelId) };
    });
  }

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        Loading dashboard...
      </div>
    );
  }

  if (error || !dashboard) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4">
        <p className="text-sm text-destructive">{error ?? "Not found"}</p>
        <Button asChild variant="outline">
          <Link href="/dashboards">Back to Dashboards</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 border-b-2 border-black px-4 py-3">
        <Button asChild variant="ghost" size="icon" className="size-8">
          <Link href="/dashboards">
            <ArrowLeft className="size-4" />
          </Link>
        </Button>
        <h1 className="text-sm font-black uppercase tracking-tight">
          {dashboard.title}
        </h1>
        <span className="text-xs text-muted-foreground">
          {dashboard.panels.length} panel
          {dashboard.panels.length !== 1 ? "s" : ""}
        </span>
        {dashboard.dataSource && (
          <Badge variant="secondary" className="gap-1 text-[10px]">
            <Database className="size-3" />
            {dashboard.dataSource.name}
          </Badge>
        )}
      </div>

      <div className="flex flex-1 min-h-0">
        <div
          className="flex flex-col border-r-2 border-black"
          style={{ width: sidebarWidth, minWidth: 280, maxWidth: 500 }}
        >
          <ChatPanel
            dataSourceId={dashboard.dataSourceId ?? undefined}
            onPinChart={(data) => void handlePinChart(data)}
          />
        </div>

        <div
          className="w-1 cursor-col-resize bg-transparent hover:bg-muted-foreground/20 transition-colors flex items-center justify-center"
          onMouseDown={handleMouseDown}
        >
          <GripVertical className="size-3 text-muted-foreground/40" />
        </div>

        <div className="flex-1 overflow-auto p-4">
          {dashboard.panels.length === 0 ? (
            <div className="flex h-full items-center justify-center">
              <div className="text-center max-w-sm">
                <p className="text-sm font-medium text-muted-foreground">
                  Ask a question in the chat to get started, then pin results to build your dashboard.
                </p>
              </div>
            </div>
          ) : (
            <DashboardCanvas
              panels={dashboard.panels}
              dataSourceId={dashboard.dataSourceId ?? undefined}
              onLayoutChange={(layouts) => void handleLayoutChange(layouts)}
              onRemovePanel={(panelId) => void handleRemovePanel(panelId)}
              onRenamePanel={(panelId, title) => void handleRenamePanel(panelId, title)}
            />
          )}
        </div>
      </div>
    </div>
  );
}
