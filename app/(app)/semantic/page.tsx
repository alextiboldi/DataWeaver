"use client";

import * as React from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Database, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { SemanticModelResponse, TableMeta } from "@/lib/types/api";

interface DataSourceItem {
  id: string;
  name: string;
  type: string;
  status: string;
}

interface ModelInfo {
  tableCount: number;
  metricCount: number;
}

export default function SemanticModelsPage() {
  const queryClient = useQueryClient();
  const [discovering, setDiscovering] = React.useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["semantic-models"],
    queryFn: async () => {
      const res = await fetch("/api/connections");
      const connData = (await res.json()) as { connections: DataSourceItem[] };
      const connections = connData.connections;

      const modelMap: Record<string, ModelInfo> = {};
      await Promise.all(
        connections.map(async (conn) => {
          const mRes = await fetch(`/api/semantic/${conn.id}`);
          if (mRes.ok) {
            const mData = (await mRes.json()) as { model: SemanticModelResponse };
            modelMap[conn.id] = {
              tableCount: (mData.model.tables as TableMeta[]).length,
              metricCount: mData.model.metrics.length,
            };
          }
        }),
      );

      return { connections, models: modelMap };
    },
  });

  const connections = data?.connections ?? [];
  const models = data?.models ?? {};

  async function handleDiscover(dataSourceId: string) {
    setDiscovering(dataSourceId);
    try {
      await fetch(`/api/semantic/${dataSourceId}/discover`, { method: "POST" });
      await queryClient.invalidateQueries({ queryKey: ["semantic-models"] });
    } finally {
      setDiscovering(null);
    }
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-black uppercase tracking-tight">
          Semantic Models
        </h1>
        <p className="text-sm text-muted-foreground">
          Browse discovered schemas, relationships, and business metrics.
        </p>
      </div>

      {isLoading ? (
        <div className="text-sm text-muted-foreground">Loading...</div>
      ) : connections.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Database className="mb-4 size-12 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              No data connections yet.{" "}
              <Link href="/connections" className="underline font-bold">
                Add one
              </Link>{" "}
              to get started.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {connections.map((conn) => {
            const model = models[conn.id];
            const hasModel = !!model;

            return (
              <Card key={conn.id} className="group relative">
                {hasModel ? (
                  <Link href={`/semantic/${conn.id}`}>
                    <CardHeader>
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-base">{conn.name}</CardTitle>
                        <Badge variant="outline" className="font-mono text-[10px]">
                          {conn.type}
                        </Badge>
                      </div>
                      <CardDescription>
                        {model.tableCount} table{model.tableCount !== 1 ? "s" : ""}
                        {" · "}
                        {model.metricCount} metric{model.metricCount !== 1 ? "s" : ""}
                      </CardDescription>
                    </CardHeader>
                  </Link>
                ) : (
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-base">{conn.name}</CardTitle>
                      <Badge variant="outline" className="font-mono text-[10px]">
                        {conn.type}
                      </Badge>
                    </div>
                    <CardDescription>No schema discovered yet</CardDescription>
                    <div className="pt-2">
                      <Button
                        size="sm"
                        onClick={() => void handleDiscover(conn.id)}
                        disabled={discovering === conn.id}
                        className="gap-2"
                      >
                        <RefreshCw
                          className={`size-3 ${discovering === conn.id ? "animate-spin" : ""}`}
                        />
                        {discovering === conn.id ? "Discovering..." : "Discover Schema"}
                      </Button>
                    </div>
                  </CardHeader>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
