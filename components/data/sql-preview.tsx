"use client";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface SqlPreviewProps {
  sql: string;
  executionMs?: number;
}

export function SqlPreview({ sql, executionMs }: SqlPreviewProps) {
  return (
    <Card className="p-3 bg-zinc-950 text-zinc-100">
      <div className="flex items-center justify-between mb-2">
        <Badge variant="outline" className="text-xs">
          SQL
        </Badge>
        {executionMs !== undefined && (
          <span className="text-xs text-zinc-400">{executionMs}ms</span>
        )}
      </div>
      <pre className="text-sm font-mono whitespace-pre-wrap overflow-x-auto">
        {sql}
      </pre>
    </Card>
  );
}
