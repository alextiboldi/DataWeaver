"use client";

import * as React from "react";
import { Sparkles } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

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

interface TableDetail {
  id: string;
  tableName: string;
  displayName: string;
  description: string | null;
  tags: string[];
  columns: Column[];
}

interface TableDetailSheetProps {
  catalogId: string;
  tableId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdated: () => void;
}

export function TableDetailSheet({
  catalogId,
  tableId,
  open,
  onOpenChange,
  onUpdated,
}: TableDetailSheetProps) {
  const [table, setTable] = React.useState<TableDetail | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [aiLoading, setAiLoading] = React.useState(false);

  React.useEffect(() => {
    if (!tableId || !open) return;
    setLoading(true);
    fetch(`/api/catalog/${catalogId}/tables/${tableId}`)
      .then((r) => r.json())
      .then((data: { table: TableDetail }) => setTable(data.table))
      .finally(() => setLoading(false));
  }, [catalogId, tableId, open]);

  const handleTableUpdate = async (
    field: "displayName" | "description",
    value: string,
  ) => {
    if (!tableId) return;
    await fetch(`/api/catalog/${catalogId}/tables/${tableId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [field]: value }),
    });
    onUpdated();
  };

  const handleColumnUpdate = async (
    columnId: string,
    field: "displayName" | "description",
    value: string,
  ) => {
    if (!tableId) return;
    await fetch(
      `/api/catalog/${catalogId}/tables/${tableId}/columns/${columnId}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: value }),
      },
    );
    onUpdated();
  };

  const handleAiDocument = async () => {
    if (!tableId) return;
    setAiLoading(true);
    try {
      await fetch(
        `/api/catalog/${catalogId}/tables/${tableId}/ai-document`,
        { method: "POST" },
      );
      const res = await fetch(`/api/catalog/${catalogId}/tables/${tableId}`);
      const data: { table: TableDetail } = await res.json();
      setTable(data.table);
      onUpdated();
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-lg">
        {loading || !table ? (
          <SheetHeader>
            <SheetTitle>Loading...</SheetTitle>
          </SheetHeader>
        ) : (
          <>
            <SheetHeader>
              <SheetTitle className="flex items-center gap-2">
                <EditableText
                  value={table.displayName}
                  onSave={(v) => handleTableUpdate("displayName", v)}
                  className="text-lg font-semibold"
                />
              </SheetTitle>
              <SheetDescription className="font-mono text-xs">
                {table.tableName}
              </SheetDescription>
              {table.tags.length > 0 && (
                <div className="flex gap-1 flex-wrap">
                  {table.tags.map((tag) => (
                    <Badge key={tag} variant="secondary">
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}
            </SheetHeader>

            <div className="px-4 space-y-4 flex-1 overflow-hidden flex flex-col">
              <div>
                <label className="text-xs font-medium text-muted-foreground">
                  Description
                </label>
                <EditableText
                  value={table.description || ""}
                  placeholder="Add a description..."
                  onSave={(v) => handleTableUpdate("description", v)}
                  className="text-sm"
                />
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={handleAiDocument}
                disabled={aiLoading}
              >
                <Sparkles className="size-3.5 mr-1.5" />
                {aiLoading ? "Generating..." : "AI Document"}
              </Button>

              <div className="flex-1 min-h-0">
                <h4 className="text-xs font-medium text-muted-foreground mb-2">
                  Columns ({table.columns.length})
                </h4>
                <ScrollArea className="h-full max-h-[calc(100vh-320px)]">
                  <div className="space-y-3 pr-3">
                    {table.columns.map((col) => (
                      <div
                        key={col.id}
                        className="rounded-md border p-2.5 space-y-1.5"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-xs font-medium">
                            {col.columnName}
                          </span>
                          <div className="flex gap-1 items-center">
                            <span className="text-xs text-muted-foreground">
                              {col.dataType}
                            </span>
                            {col.isPrimaryKey && (
                              <Badge
                                variant="outline"
                                className="text-[10px] px-1 py-0"
                              >
                                PK
                              </Badge>
                            )}
                            {col.isForeignKey && (
                              <Badge
                                variant="outline"
                                className="text-[10px] px-1 py-0"
                              >
                                FK
                              </Badge>
                            )}
                          </div>
                        </div>
                        <EditableText
                          value={col.description || ""}
                          placeholder="Add description..."
                          onSave={(v) =>
                            handleColumnUpdate(col.id, "description", v)
                          }
                          className="text-xs text-muted-foreground"
                        />
                        {col.isForeignKey && col.foreignTable && (
                          <div className="text-[10px] text-muted-foreground">
                            References {col.foreignTable}.{col.foreignColumn}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

function EditableText({
  value,
  placeholder,
  onSave,
  className,
}: {
  value: string;
  placeholder?: string;
  onSave: (value: string) => void;
  className?: string;
}) {
  const [editing, setEditing] = React.useState(false);
  const [draft, setDraft] = React.useState(value);

  React.useEffect(() => {
    setDraft(value);
  }, [value]);

  if (editing) {
    return (
      <Input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => {
          setEditing(false);
          if (draft !== value) onSave(draft);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            setEditing(false);
            if (draft !== value) onSave(draft);
          }
          if (e.key === "Escape") {
            setEditing(false);
            setDraft(value);
          }
        }}
        autoFocus
        className="h-7 text-sm"
        placeholder={placeholder}
      />
    );
  }

  return (
    <div
      onClick={() => setEditing(true)}
      className={`cursor-pointer hover:bg-muted/50 rounded px-1 py-0.5 -mx-1 ${className}`}
    >
      {value || (
        <span className="text-muted-foreground italic">{placeholder}</span>
      )}
    </div>
  );
}
