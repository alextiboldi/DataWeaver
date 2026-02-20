"use client";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface SqlPreviewProps {
  sql: string;
  executionMs?: number;
}

export function SqlPreview({ sql, executionMs }: SqlPreviewProps) {
  return (
    <Card className="px-3 py-2 gap-0 bg-zinc-950 text-zinc-100 max-h-80 overflow-auto">
      <div className="flex items-center justify-between mb-0.5 sticky top-0 bg-zinc-950 z-10">
        <Badge variant="outline" className="text-xs">
          SQL
        </Badge>
        {executionMs !== undefined && (
          <span className="text-xs text-zinc-400">{executionMs}ms</span>
        )}
      </div>
      <pre className="text-sm font-mono whitespace-pre-wrap">{sql.trim()}</pre>
    </Card>
  );
}
