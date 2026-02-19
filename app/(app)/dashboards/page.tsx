"use client";

import * as React from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, LayoutDashboard, Trash2, Database } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CreateDashboardDialog } from "@/components/dashboard/create-dashboard-dialog";

interface DashboardSummary {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  _count: { panels: number };
  dataSource: { id: string; name: string; type: string } | null;
}

export default function DashboardsPage(): React.ReactElement {
  const queryClient = useQueryClient();

  const { data: dashboards = [], isLoading } = useQuery({
    queryKey: ["dashboards"],
    queryFn: async () => {
      const res = await fetch("/api/dashboards");
      const json = (await res.json()) as { dashboards: DashboardSummary[] };
      return json.dashboards;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await fetch(`/api/dashboards/${id}`, { method: "DELETE" });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["dashboards"] });
    },
  });

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black uppercase tracking-tight">Dashboards</h1>
          <p className="text-sm text-muted-foreground">
            Pin charts from conversations and arrange them into dashboards.
          </p>
        </div>
        <CreateDashboardDialog>
          <Button className="gap-2">
            <Plus className="size-4" />
            New Dashboard
          </Button>
        </CreateDashboardDialog>
      </div>

      {isLoading ? (
        <div className="text-sm text-muted-foreground">Loading...</div>
      ) : dashboards.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <LayoutDashboard className="mb-4 size-12 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              No dashboards yet. Create one to get started.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {dashboards.map((dashboard) => (
            <Card key={dashboard.id} className="group relative">
              <Link href={`/dashboards/${dashboard.id}`}>
                <CardHeader>
                  <CardTitle className="text-base">{dashboard.title}</CardTitle>
                  <CardDescription>
                    {dashboard._count.panels} panel
                    {dashboard._count.panels !== 1 ? "s" : ""} &middot;
                    Updated{" "}
                    {new Date(dashboard.updatedAt).toLocaleDateString()}
                  </CardDescription>
                  {dashboard.dataSource && (
                    <Badge variant="secondary" className="mt-2 w-fit gap-1 text-[10px]">
                      <Database className="size-3" />
                      {dashboard.dataSource.name}
                    </Badge>
                  )}
                </CardHeader>
              </Link>
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity size-7"
                onClick={() => deleteMutation.mutate(dashboard.id)}
              >
                <Trash2 className="size-3" />
              </Button>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
