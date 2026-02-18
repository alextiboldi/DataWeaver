"use client";

import * as React from "react";
import { ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { TableMeta } from "@/lib/types/api";

interface TableListProps {
  tables: TableMeta[];
}

export function TableList({ tables }: TableListProps) {
  const [expanded, setExpanded] = React.useState<string | null>(null);

  function toggle(name: string) {
    setExpanded((prev) => (prev === name ? null : name));
  }

  if (tables.length === 0) {
    return (
      <p className="text-center py-12 text-sm text-muted-foreground">
        No tables discovered yet.
      </p>
    );
  }

  return (
    <div className="space-y-0 border-2 border-black">
      {tables.map((table) => {
        const isOpen = expanded === table.name;
        return (
          <div key={table.name} className="border-b-2 border-black last:border-b-0">
            <button
              onClick={() => toggle(table.name)}
              className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-neutral-50 transition-colors"
            >
              <ChevronRight
                className={`size-4 shrink-0 transition-transform ${isOpen ? "rotate-90" : ""}`}
              />
              <div className="flex-1 min-w-0">
                <span className="font-bold text-sm">{table.displayName}</span>
                <span className="ml-2 font-mono text-xs text-muted-foreground">
                  {table.name}
                </span>
              </div>
              <span className="text-xs text-muted-foreground">
                {table.columns.length} col{table.columns.length !== 1 ? "s" : ""}
              </span>
            </button>
            {isOpen && (
              <div className="border-t-2 border-black">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="font-bold text-xs uppercase">Column</TableHead>
                      <TableHead className="font-bold text-xs uppercase">Display Name</TableHead>
                      <TableHead className="font-bold text-xs uppercase">Type</TableHead>
                      <TableHead className="font-bold text-xs uppercase">Flags</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {table.columns.map((col) => (
                      <TableRow key={col.name}>
                        <TableCell className="font-mono text-xs">{col.name}</TableCell>
                        <TableCell className="text-xs">{col.displayName}</TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground">
                          {col.type}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            {col.isPrimaryKey && <Badge variant="default">PK</Badge>}
                            {col.isForeignKey && (
                              <Badge variant="outline">
                                FK → {col.referencesTable}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
