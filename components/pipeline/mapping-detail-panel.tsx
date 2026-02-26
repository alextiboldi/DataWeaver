"use client";

import * as React from "react";
import { X, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { MappingData } from "@/app/(app)/pipelines/[id]/page";

interface ColumnPair {
  source: string;
  dest: string;
}

function toColumnPairs(record: Record<string, string>): ColumnPair[] {
  const entries = Object.entries(record);
  return entries.length > 0
    ? entries.map(([source, dest]) => ({ source, dest }))
    : [{ source: "", dest: "" }];
}

function toColumnRecord(pairs: ColumnPair[]): Record<string, string> {
  const record: Record<string, string> = {};
  for (const pair of pairs) {
    const key = pair.source.trim();
    if (key) {
      record[key] = pair.dest.trim();
    }
  }
  return record;
}

interface MappingDetailPanelProps {
  pipelineId: string;
  mapping: MappingData;
  onUpdated: () => void;
  onClose: () => void;
}

export function MappingDetailPanel({
  pipelineId,
  mapping,
  onUpdated,
  onClose,
}: MappingDetailPanelProps): React.ReactElement {
  const [name, setName] = React.useState(mapping.name);
  const [sourceQuery, setSourceQuery] = React.useState(mapping.sourceQuery);
  const [columnPairs, setColumnPairs] = React.useState<ColumnPair[]>(() =>
    toColumnPairs(mapping.columnMappings)
  );
  const [conflictStrategy, setConflictStrategy] = React.useState(
    mapping.conflictStrategy || "insert"
  );
  const [saving, setSaving] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);

  // Reset local state when the selected mapping changes
  React.useEffect(() => {
    setName(mapping.name);
    setSourceQuery(mapping.sourceQuery);
    setColumnPairs(toColumnPairs(mapping.columnMappings));
    setConflictStrategy(mapping.conflictStrategy || "insert");
  }, [mapping.id, mapping.name, mapping.sourceQuery, mapping.columnMappings, mapping.conflictStrategy]);

  function updateColumnPair(
    index: number,
    field: "source" | "dest",
    value: string
  ): void {
    setColumnPairs((prev) =>
      prev.map((pair, i) =>
        i === index ? { ...pair, [field]: value } : pair
      )
    );
  }

  function removeColumnPair(index: number): void {
    setColumnPairs((prev) => {
      const next = prev.filter((_, i) => i !== index);
      return next.length > 0 ? next : [{ source: "", dest: "" }];
    });
  }

  function addColumnPair(): void {
    setColumnPairs((prev) => [...prev, { source: "", dest: "" }]);
  }

  async function handleSave(): Promise<void> {
    setSaving(true);
    try {
      const res = await fetch(
        `/api/pipelines/${pipelineId}/mappings/${mapping.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name,
            sourceQuery,
            columnMappings: toColumnRecord(columnPairs),
            conflictStrategy,
          }),
        }
      );
      if (!res.ok) throw new Error("Save failed");
      onUpdated();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(): Promise<void> {
    setDeleting(true);
    try {
      const res = await fetch(
        `/api/pipelines/${pipelineId}/mappings/${mapping.id}`,
        { method: "DELETE" }
      );
      if (!res.ok) throw new Error("Delete failed");
      onUpdated();
      onClose();
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center gap-2 border-b-2 border-black px-3 py-2">
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="h-7 flex-1 border-0 px-1 text-sm font-black uppercase tracking-tight focus-visible:ring-0 focus-visible:ring-offset-0"
        />
        <Button
          variant="ghost"
          size="icon-xs"
          onClick={onClose}
        >
          <X className="size-4" />
        </Button>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto">
        {/* Source Query */}
        <div className="border-b-2 border-black p-3">
          <label className="mb-1.5 block text-[10px] font-black uppercase tracking-tight text-muted-foreground">
            Source Query
          </label>
          <Textarea
            value={sourceQuery}
            onChange={(e) => setSourceQuery(e.target.value)}
            rows={8}
            className="font-mono text-xs leading-relaxed"
            placeholder="SELECT ..."
          />
        </div>

        {/* Destination Table */}
        <div className="border-b-2 border-black p-3">
          <label className="mb-1.5 block text-[10px] font-black uppercase tracking-tight text-muted-foreground">
            Destination Table
          </label>
          <div className="flex h-7 items-center border-2 border-black bg-neutral-50 px-2 text-xs font-medium">
            {mapping.destTable || "Not set"}
          </div>
        </div>

        {/* Column Mappings */}
        <div className="border-b-2 border-black p-3">
          <label className="mb-1.5 block text-[10px] font-black uppercase tracking-tight text-muted-foreground">
            Column Mappings
          </label>
          <div className="mb-1 flex gap-1 text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
            <span className="flex-1">Source Alias</span>
            <span className="flex-1">Dest Column</span>
            <span className="w-6" />
          </div>
          <div className="space-y-1">
            {columnPairs.map((pair, index) => (
              <div key={index} className="flex items-center gap-1">
                <Input
                  value={pair.source}
                  onChange={(e) =>
                    updateColumnPair(index, "source", e.target.value)
                  }
                  placeholder="source"
                  className="h-7 flex-1 px-1.5 text-xs"
                />
                <Input
                  value={pair.dest}
                  onChange={(e) =>
                    updateColumnPair(index, "dest", e.target.value)
                  }
                  placeholder="dest"
                  className="h-7 flex-1 px-1.5 text-xs"
                />
                <Button
                  variant="ghost"
                  size="icon-xs"
                  onClick={() => removeColumnPair(index)}
                  className="shrink-0"
                >
                  <X className="size-3" />
                </Button>
              </div>
            ))}
          </div>
          <Button
            variant="outline"
            size="xs"
            className="mt-2 w-full gap-1"
            onClick={addColumnPair}
          >
            <Plus className="size-3" />
            Add Row
          </Button>
        </div>

        {/* Conflict Strategy */}
        <div className="border-b-2 border-black p-3">
          <label className="mb-1.5 block text-[10px] font-black uppercase tracking-tight text-muted-foreground">
            Conflict Strategy
          </label>
          <select
            value={conflictStrategy}
            onChange={(e) => setConflictStrategy(e.target.value)}
            className="h-8 w-full border-2 border-black bg-transparent px-2 text-xs font-medium outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2"
          >
            <option value="insert">Insert</option>
            <option value="upsert">Upsert</option>
            <option value="replace">Replace</option>
          </select>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2 border-t-2 border-black p-3">
        <Button
          className="flex-1"
          size="sm"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? "Saving..." : "Save"}
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="gap-1 border-destructive text-destructive hover:bg-destructive hover:text-white"
          onClick={handleDelete}
          disabled={deleting}
        >
          <Trash2 className="size-3" />
          {deleting ? "Deleting..." : "Delete"}
        </Button>
      </div>
    </div>
  );
}
