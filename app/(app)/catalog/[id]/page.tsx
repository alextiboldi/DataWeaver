"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ErdCanvas } from "@/components/catalog/erd-canvas";
import { TableDetailSheet } from "@/components/catalog/table-detail-sheet";

interface Column {
  id: string;
  columnName: string;
  displayName: string;
  description: string | null;
  dataType: string;
  nullable: boolean;
  isPrimaryKey: boolean;
  isForeignKey: boolean;
  foreignTable: string | null;
  foreignColumn: string | null;
}

interface TableData {
  id: string;
  tableName: string;
  displayName: string;
  description: string | null;
  tags: string[];
  columns: Column[];
}

interface CatalogDetail {
  id: string;
  name: string;
  description: string | null;
  tables: TableData[];
}

export default function CatalogDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [catalog, setCatalog] = React.useState<CatalogDetail | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [selectedTableId, setSelectedTableId] = React.useState<string | null>(
    null,
  );
  const [sheetOpen, setSheetOpen] = React.useState(false);
  const [aiAllLoading, setAiAllLoading] = React.useState(false);

  const loadCatalog = React.useCallback(async () => {
    const res = await fetch(`/api/catalog/${id}`);
    const data: { catalog: CatalogDetail } = await res.json();
    setCatalog(data.catalog);
    setLoading(false);
  }, [id]);

  React.useEffect(() => {
    loadCatalog();
  }, [loadCatalog]);

  const handleTableClick = (tableId: string) => {
    setSelectedTableId(tableId);
    setSheetOpen(true);
  };

  const handleAiDocumentAll = async () => {
    setAiAllLoading(true);
    try {
      await fetch(`/api/catalog/${id}/ai-document`, { method: "POST" });
      await loadCatalog();
    } finally {
      setAiAllLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col h-full p-6 gap-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-72" />
        <Skeleton className="flex-1" />
      </div>
    );
  }

  if (!catalog) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">Catalog not found.</p>
      </div>
    );
  }

  const undocumentedCount = catalog.tables.filter(
    (t) => !t.description,
  ).length;

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-6 py-4 border-b">
        <div>
          <h1 className="text-xl font-bold">{catalog.name}</h1>
          <p className="text-sm text-muted-foreground">
            {catalog.tables.length} tables
            {catalog.description && ` \u2014 ${catalog.description}`}
          </p>
        </div>
        {undocumentedCount > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleAiDocumentAll}
            disabled={aiAllLoading}
          >
            <Sparkles className="size-3.5 mr-1.5" />
            {aiAllLoading
              ? "Documenting..."
              : `AI Document All (${undocumentedCount})`}
          </Button>
        )}
      </div>

      <div className="flex-1 min-h-0">
        <ErdCanvas tables={catalog.tables} onTableClick={handleTableClick} />
      </div>

      <TableDetailSheet
        catalogId={id}
        tableId={selectedTableId}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        onUpdated={loadCatalog}
      />
    </div>
  );
}
