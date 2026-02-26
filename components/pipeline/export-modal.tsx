"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { Copy, Download, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

interface ExportModalProps {
  pipelineId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ExportModal({
  pipelineId,
  open,
  onOpenChange,
}: ExportModalProps): React.ReactElement {
  const [copied, setCopied] = React.useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ["pipeline-export", pipelineId],
    queryFn: async () => {
      const res = await fetch(`/api/pipelines/${pipelineId}/generate`);
      if (!res.ok) throw new Error("Failed to generate SQL");
      const json = (await res.json()) as { sql: string };
      return json.sql;
    },
    enabled: open,
  });

  async function handleCopy(): Promise<void> {
    if (!data) return;
    await navigator.clipboard.writeText(data);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleDownload(): void {
    if (!data) return;
    const blob = new Blob([data], { type: "text/sql" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `pipeline-${pipelineId}.sql`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Export SQL</DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
            <Loader2 className="mr-2 size-4 animate-spin" />
            Generating SQL...
          </div>
        ) : error ? (
          <div className="py-8 text-center text-sm text-destructive">
            Failed to generate SQL. Make sure you have at least one mapping
            defined.
          </div>
        ) : (
          <>
            <div className="max-h-[60vh] overflow-auto rounded-none border-2 border-black bg-neutral-950 p-4">
              <pre className="text-xs font-mono text-neutral-50 whitespace-pre overflow-x-auto">
                {data}
              </pre>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() => void handleCopy()}
              >
                {copied ? (
                  <Check className="size-3.5" />
                ) : (
                  <Copy className="size-3.5" />
                )}
                {copied ? "Copied" : "Copy to Clipboard"}
              </Button>
              <Button
                size="sm"
                className="gap-1.5"
                onClick={handleDownload}
              >
                <Download className="size-3.5" />
                Download .sql
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
