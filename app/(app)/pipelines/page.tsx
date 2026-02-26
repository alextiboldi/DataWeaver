"use client";

import * as React from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Workflow, Trash2, Database, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CreatePipelineDialog } from "@/components/pipeline/create-pipeline-dialog";

interface PipelineSummary {
  id: string;
  name: string;
  description: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
  _count: { mappings: number };
  sourceDataSource: { id: string; name: string; type: string };
  destDataSource: { id: string; name: string; type: string };
}

export default function PipelinesPage(): React.ReactElement {
  const queryClient = useQueryClient();

  const { data: pipelines = [], isLoading } = useQuery({
    queryKey: ["pipelines"],
    queryFn: async () => {
      const res = await fetch("/api/pipelines");
      const json = (await res.json()) as { pipelines: PipelineSummary[] };
      return json.pipelines;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await fetch(`/api/pipelines/${id}`, { method: "DELETE" });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["pipelines"] });
    },
  });

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black uppercase tracking-tight">ETL Pipelines</h1>
          <p className="text-sm text-muted-foreground">
            Map data between sources and export SQL scripts.
          </p>
        </div>
        <CreatePipelineDialog>
          <Button className="gap-2">
            <Plus className="size-4" />
            New Pipeline
          </Button>
        </CreatePipelineDialog>
      </div>

      {isLoading ? (
        <div className="text-sm text-muted-foreground">Loading...</div>
      ) : pipelines.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Workflow className="mb-4 size-12 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              No pipelines yet. Create one to get started.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {pipelines.map((pipeline) => (
            <Card key={pipeline.id} className="group relative">
              <Link href={`/pipelines/${pipeline.id}`}>
                <CardHeader>
                  <CardTitle className="text-base">{pipeline.name}</CardTitle>
                  <CardDescription>
                    {pipeline._count.mappings} mapping
                    {pipeline._count.mappings !== 1 ? "s" : ""} &middot;
                    Updated{" "}
                    {new Date(pipeline.updatedAt).toLocaleDateString()}
                  </CardDescription>
                  <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                    <Badge variant="secondary" className="gap-1 text-[10px]">
                      <Database className="size-3" />
                      {pipeline.sourceDataSource.name}
                    </Badge>
                    <ArrowRight className="size-3 text-muted-foreground" />
                    <Badge variant="secondary" className="gap-1 text-[10px]">
                      <Database className="size-3" />
                      {pipeline.destDataSource.name}
                    </Badge>
                  </div>
                  <Badge
                    variant={pipeline.status === "ready" ? "default" : "outline"}
                    className="mt-2 w-fit text-[10px]"
                  >
                    {pipeline.status}
                  </Badge>
                </CardHeader>
              </Link>
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity size-7"
                onClick={() => deleteMutation.mutate(pipeline.id)}
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
