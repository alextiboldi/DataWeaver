"use client";

import * as React from "react";
import { use } from "react";
import Link from "next/link";
import {
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import type { LayoutItem } from "react-grid-layout";
import type { UIMessage } from "ai";
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
  const queryClient = useQueryClient();
  const [sidebarWidth, setSidebarWidth] = React.useState(380);
  const isResizing = React.useRef(false);

  const { data: dashboard, isLoading, error } = useQuery({
    queryKey: ["dashboard", id],
    queryFn: async () => {
      const res = await fetch(`/api/dashboards/${id}`);
      if (!res.ok) throw new Error("Dashboard not found");
      const json = (await res.json()) as { dashboard: DashboardDetail };
      return json.dashboard;
    },
  });

  const { data: chatMessages = [], isLoading: isLoadingMessages } = useQuery({
    queryKey: ["dashboard-messages", id],
    queryFn: async () => {
      const res = await fetch(`/api/dashboards/${id}/messages`);
      if (!res.ok) return [];
      const json = (await res.json()) as { messages: UIMessage[] };
      return json.messages;
    },
  });

  const pinChartMutation = useMutation({
    mutationFn: async (data: { chartType: string; sql: string; title: string; description?: string }) => {
      const res = await fetch(`/api/dashboards/${id}/panels`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chartType: data.chartType,
          sql: data.sql,
          title: data.title,
          description: data.description,
        }),
      });
      if (!res.ok) throw new Error("Failed to pin chart");
      return (await res.json()) as { panel: DashboardPanelData };
    },
    onSuccess: (result) => {
      queryClient.setQueryData<DashboardDetail>(["dashboard", id], (prev) => {
        if (!prev) return prev;
        return { ...prev, panels: [...prev.panels, result.panel] };
      });
    },
  });

  const layoutMutation = useMutation({
    mutationFn: async (layouts: LayoutItem[]) => {
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
        ) return;
        await fetch(`/api/dashboards/${id}/panels/${panel.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ layout: newLayout }),
        });
      });
      await Promise.all(updates);
      return layouts;
    },
    onSuccess: (layouts) => {
      if (!layouts) return;
      queryClient.setQueryData<DashboardDetail>(["dashboard", id], (prev) => {
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
    },
  });

  const renameMutation = useMutation({
    mutationFn: async ({ panelId, title }: { panelId: string; title: string }) => {
      await fetch(`/api/dashboards/${id}/panels/${panelId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
      });
      return { panelId, title };
    },
    onSuccess: ({ panelId, title }) => {
      queryClient.setQueryData<DashboardDetail>(["dashboard", id], (prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          panels: prev.panels.map((p) =>
            p.id === panelId ? { ...p, title } : p
          ),
        };
      });
    },
  });

  const removeMutation = useMutation({
    mutationFn: async (panelId: string) => {
      await fetch(`/api/dashboards/${id}/panels/${panelId}`, { method: "DELETE" });
      return panelId;
    },
    onSuccess: (panelId) => {
      queryClient.setQueryData<DashboardDetail>(["dashboard", id], (prev) => {
        if (!prev) return prev;
        return { ...prev, panels: prev.panels.filter((p) => p.id !== panelId) };
      });
    },
  });

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
        <p className="text-sm text-destructive">{error instanceof Error ? error.message : "Not found"}</p>
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
            dashboardId={id}
            initialMessages={chatMessages.length > 0 ? chatMessages : undefined}
            isLoadingMessages={isLoadingMessages}
            onPinChart={(data) => pinChartMutation.mutate(data)}
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
              onLayoutChange={(layouts) => layoutMutation.mutate(layouts)}
              onRemovePanel={(panelId) => removeMutation.mutate(panelId)}
              onRenamePanel={(panelId, title) => renameMutation.mutate({ panelId, title })}
            />
          )}
        </div>
      </div>
    </div>
  );
}
