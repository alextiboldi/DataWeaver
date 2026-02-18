"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TableList } from "@/components/semantic/table-list";
import { RelationshipList } from "@/components/semantic/relationship-list";
import { MetricList } from "@/components/semantic/metric-list";
import type {
  SemanticModelResponse,
  TableMeta,
  JoinPath,
  MetricDefinitionResponse,
} from "@/lib/types/api";

interface DataSourceItem {
  id: string;
  name: string;
  type: string;
}

export default function SemanticDetailPage() {
  const { dataSourceId } = useParams<{ dataSourceId: string }>();
  const [dataSource, setDataSource] = React.useState<DataSourceItem | null>(null);
  const [model, setModel] = React.useState<SemanticModelResponse | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [rediscovering, setRediscovering] = React.useState(false);

  const load = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const [connRes, modelRes] = await Promise.all([
        fetch("/api/connections"),
        fetch(`/api/semantic/${dataSourceId}`),
      ]);
      const connData = (await connRes.json()) as { connections: DataSourceItem[] };
      const ds = connData.connections.find((c) => c.id === dataSourceId);
      if (ds) setDataSource(ds);

      if (modelRes.ok) {
        const mData = (await modelRes.json()) as { model: SemanticModelResponse };
        setModel(mData.model);
      }
    } finally {
      setIsLoading(false);
    }
  }, [dataSourceId]);

  React.useEffect(() => {
    void load();
  }, [load]);

  async function handleRediscover() {
    setRediscovering(true);
    try {
      await fetch(`/api/semantic/${dataSourceId}/discover`, { method: "POST" });
      await load();
    } finally {
      setRediscovering(false);
    }
  }

  if (isLoading) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!dataSource) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <p className="text-sm text-muted-foreground">Data source not found.</p>
      </div>
    );
  }

  const tables = (model?.tables ?? []) as TableMeta[];
  const relationships = (model?.relationships ?? []) as JoinPath[];
  const metrics = (model?.metrics ?? []) as MetricDefinitionResponse[];

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-black uppercase tracking-tight">
            {dataSource.name}
          </h1>
          <Badge variant="outline" className="font-mono text-[10px]">
            {dataSource.type}
          </Badge>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          onClick={() => void handleRediscover()}
          disabled={rediscovering}
        >
          <RefreshCw className={`size-3 ${rediscovering ? "animate-spin" : ""}`} />
          {rediscovering ? "Discovering..." : "Re-discover"}
        </Button>
      </div>

      {!model ? (
        <p className="text-sm text-muted-foreground">
          No semantic model yet. Click &quot;Re-discover&quot; to introspect the schema.
        </p>
      ) : (
        <Tabs defaultValue="tables">
          <TabsList>
            <TabsTrigger value="tables">
              Tables ({tables.length})
            </TabsTrigger>
            <TabsTrigger value="relationships">
              Relationships ({relationships.length})
            </TabsTrigger>
            <TabsTrigger value="metrics">
              Metrics ({metrics.length})
            </TabsTrigger>
          </TabsList>
          <TabsContent value="tables" className="mt-4">
            <TableList tables={tables} />
          </TabsContent>
          <TabsContent value="relationships" className="mt-4">
            <RelationshipList relationships={relationships} />
          </TabsContent>
          <TabsContent value="metrics" className="mt-4">
            <MetricList
              dataSourceId={dataSourceId}
              metrics={metrics}
              onUpdate={() => void load()}
            />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
