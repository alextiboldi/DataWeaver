"use client";

import * as React from "react";
import { ConnectionList } from "@/components/connections/connection-list";
import { ConnectionForm } from "@/components/connections/connection-form";

interface DataSourceItem {
  id: string;
  name: string;
  type: string;
  status: string;
  createdAt: string;
}

export default function ConnectionsPage() {
  const [connections, setConnections] = React.useState<DataSourceItem[]>([]);

  const loadConnections = React.useCallback(async () => {
    const res = await fetch("/api/connections");
    const data: { connections: DataSourceItem[] } = await res.json();
    setConnections(data.connections);
  }, []);

  React.useEffect(() => {
    loadConnections();
  }, [loadConnections]);

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-black uppercase tracking-tight">Data Connections</h1>
      <ConnectionForm onConnectionAdded={loadConnections} />
      <ConnectionList connections={connections} />
    </div>
  );
}
