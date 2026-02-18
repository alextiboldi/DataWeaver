"use client";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Database } from "lucide-react";

interface DataSourceItem {
  id: string;
  name: string;
  type: string;
  status: string;
  createdAt: string;
}

interface ConnectionListProps {
  connections: DataSourceItem[];
}

export function ConnectionList({ connections }: ConnectionListProps) {
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
      {connections.map((conn) => (
        <Card key={conn.id} className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Database className="size-5 text-muted-foreground" />
            <div>
              <p className="font-medium">{conn.name}</p>
              <p className="text-sm text-muted-foreground">{conn.type}</p>
            </div>
          </div>
          <Badge
            variant={conn.status === "connected" ? "default" : "destructive"}
          >
            {conn.status}
          </Badge>
        </Card>
      ))}
    </div>
  );
}
