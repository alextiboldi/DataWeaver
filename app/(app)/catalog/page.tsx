"use client";

import * as React from "react";
import { CatalogCard } from "@/components/catalog/catalog-card";

interface CatalogItem {
  id: string;
  name: string;
  description: string | null;
  tableCount: number;
  documentedCount: number;
}

export default function CatalogPage() {
  const [catalogs, setCatalogs] = React.useState<CatalogItem[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    async function load() {
      const res = await fetch("/api/catalog");
      const data: { catalogs: CatalogItem[] } = await res.json();
      setCatalogs(data.catalogs);
      setLoading(false);
    }
    load();
  }, []);

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-black uppercase tracking-tight">Data Catalog</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Document your databases to help the AI agent understand your data
        </p>
      </div>
      {loading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {[1, 2].map((i) => (
            <div
              key={i}
              className="h-40 rounded-none border-2 border-black bg-muted/40 animate-pulse"
            />
          ))}
        </div>
      ) : catalogs.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <p>No catalogs yet.</p>
          <p className="text-sm mt-1">
            Connect a database to automatically generate a catalog.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {catalogs.map((catalog) => (
            <CatalogCard key={catalog.id} {...catalog} />
          ))}
        </div>
      )}
    </div>
  );
}
