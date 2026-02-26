"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Database, Trash2 } from "lucide-react";
import { SOURCE_TYPES } from "@/lib/connections/source-registry";

interface DataSourceItem {
  id: string;
  name: string;
  type: string;
  status: string;
  createdAt: string;
}

interface ConnectionListProps {
  connections: DataSourceItem[];
  onDelete?: (id: string) => void;
}

export function ConnectionList({ connections, onDelete }: ConnectionListProps) {
  if (connections.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Database className="mx-auto size-12 mb-4 opacity-50" />
        <p>No data sources connected yet.</p>
        <p className="text-sm">Add a connection to get started.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {connections.map((conn) => {
        const sourceType = SOURCE_TYPES[conn.type];
        const displayName = sourceType?.displayName ?? conn.type;

        return (
          <Card key={conn.id} className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Database className="size-5 text-muted-foreground" />
              <div>
                <p className="font-medium">{conn.name}</p>
                <p className="text-sm text-muted-foreground">{displayName}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge
                variant={conn.status === "connected" ? "default" : "destructive"}
              >
                {conn.status}
              </Badge>
              {onDelete && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8 text-muted-foreground hover:text-destructive"
                  onClick={() => {
                    if (confirm(`Delete connection "${conn.name}"?`)) {
                      onDelete(conn.id);
                    }
                  }}
                >
                  <Trash2 className="size-4" />
                </Button>
              )}
            </div>
          </Card>
        );
      })}
    </div>
  );
}
