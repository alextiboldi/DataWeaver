"use client";

import * as React from "react";
import { use } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, Database, Download, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PipelineCanvas } from "@/components/pipeline/pipeline-canvas";
import { MappingDetailPanel } from "@/components/pipeline/mapping-detail-panel";
import { PipelineChatPanel } from "@/components/pipeline/pipeline-chat-panel";
import { ExportModal } from "@/components/pipeline/export-modal";

export interface MappingData {
  id: string;
  name: string;
  sourceQuery: string;
  destTable: string;
  columnMappings: Record<string, string>;
  conflictStrategy: string;
  orderIndex: number;
}

export interface TableColumnData {
  columnName: string;
  dataType: string;
  isPrimaryKey: boolean;
  isForeignKey: boolean;
}

export interface TableData {
  id: string;
  tableName: string;
  displayName: string;
  columns: TableColumnData[];
}

interface PipelineDataSource {
  id: string;
  name: string;
  type: string;
  databaseDoc: {
    tables: TableData[];
  } | null;
}

interface PipelineDetail {
  id: string;
  name: string;
  description: string | null;
  status: string;
  sourceDataSource: PipelineDataSource;
  destDataSource: PipelineDataSource;
  mappings: MappingData[];
}

export default function PipelineEditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}): React.ReactElement {
  const { id } = use(params);
  const [selectedMappingId, setSelectedMappingId] = React.useState<string | null>(null);
  const [exportOpen, setExportOpen] = React.useState(false);
  const [chatWidth, setChatWidth] = React.useState(340);
  const isResizing = React.useRef(false);

  const { data: pipeline, isLoading, error } = useQuery({
    queryKey: ["pipeline", id],
    queryFn: async () => {
      const res = await fetch(`/api/pipelines/${id}`);
      if (!res.ok) throw new Error("Pipeline not found");
      const json = (await res.json()) as { pipeline: PipelineDetail };
      return json.pipeline;
    },
  });

  const selectedMapping = pipeline?.mappings.find((m) => m.id === selectedMappingId) ?? null;

  const handleMouseDown = React.useCallback(() => {
    isResizing.current = true;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";

    function onMouseMove(e: MouseEvent): void {
      if (!isResizing.current) return;
      const newWidth = Math.min(500, Math.max(280, window.innerWidth - e.clientX));
      setChatWidth(newWidth);
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
        Loading pipeline...
      </div>
    );
  }

  if (error || !pipeline) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4">
        <p className="text-sm text-destructive">{error instanceof Error ? error.message : "Not found"}</p>
        <Button asChild variant="outline">
          <Link href="/pipelines">Back to Pipelines</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 border-b-2 border-black px-4 py-3">
        <Button asChild variant="ghost" size="icon" className="size-8">
          <Link href="/pipelines">
            <ArrowLeft className="size-4" />
          </Link>
        </Button>
        <h1 className="text-sm font-black uppercase tracking-tight">
          {pipeline.name}
        </h1>
        <div className="flex items-center gap-1.5">
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
          className="text-[10px]"
        >
          {pipeline.status}
        </Badge>
        <div className="flex-1" />
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          onClick={() => setExportOpen(true)}
        >
          <Download className="size-4" />
          Export SQL
        </Button>
      </div>

      <div className="flex flex-1 min-h-0">
        <div className="flex-1 overflow-auto">
          <PipelineCanvas
            sourceTables={pipeline.sourceDataSource.databaseDoc?.tables ?? []}
            destTables={pipeline.destDataSource.databaseDoc?.tables ?? []}
            mappings={pipeline.mappings}
            selectedMappingId={selectedMappingId}
            onSelectMapping={setSelectedMappingId}
          />
        </div>

        {selectedMapping && (
          <div
            className="border-l-2 border-black h-full"
            style={{ width: 320, minWidth: 320 }}
          >
            <MappingDetailPanel
              mapping={selectedMapping}
              onClose={() => setSelectedMappingId(null)}
            />
          </div>
        )}

        <div
          className="w-1 cursor-col-resize bg-transparent hover:bg-muted-foreground/20 transition-colors flex items-center justify-center"
          onMouseDown={handleMouseDown}
        >
          <GripVertical className="size-3 text-muted-foreground/40" />
        </div>

        <div
          className="flex flex-col border-l-2 border-black h-full"
          style={{ width: chatWidth, minWidth: 280, maxWidth: 500 }}
        >
          <PipelineChatPanel pipelineId={id} />
        </div>
      </div>

      <ExportModal
        open={exportOpen}
        onOpenChange={setExportOpen}
        pipelineId={id}
      />
    </div>
  );
}
