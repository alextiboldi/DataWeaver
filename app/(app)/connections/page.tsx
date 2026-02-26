"use client";

import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
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
  const queryClient = useQueryClient();

  const { data: connections = [] } = useQuery({
    queryKey: ["connections"],
    queryFn: async () => {
      const res = await fetch("/api/connections");
      const data: { connections: DataSourceItem[] } = await res.json();
      return data.connections;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/connections/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete connection");
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["connections"] });
    },
  });

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-black uppercase tracking-tight">Data Connections</h1>
      <ConnectionForm
        onConnectionAdded={() => {
          void queryClient.invalidateQueries({ queryKey: ["connections"] });
        }}
      />
      <ConnectionList
        connections={connections}
        onDelete={(id) => deleteMutation.mutate(id)}
      />
    </div>
  );
}
