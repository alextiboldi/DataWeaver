"use client";

import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { JoinPath } from "@/lib/types/api";

interface RelationshipListProps {
  relationships: JoinPath[];
}

export function RelationshipList({ relationships }: RelationshipListProps) {
  if (relationships.length === 0) {
    return (
      <p className="text-center py-12 text-sm text-muted-foreground">
        No relationships discovered.
      </p>
    );
  }

  return (
    <div className="border-2 border-black">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="font-bold text-xs uppercase">From</TableHead>
            <TableHead className="font-bold text-xs uppercase" />
            <TableHead className="font-bold text-xs uppercase">To</TableHead>
            <TableHead className="font-bold text-xs uppercase">Type</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {relationships.map((rel, i) => (
            <TableRow key={i}>
              <TableCell className="font-mono text-xs">
                {rel.fromTable}.{rel.fromColumn}
              </TableCell>
              <TableCell className="text-center text-muted-foreground">→</TableCell>
              <TableCell className="font-mono text-xs">
                {rel.toTable}.{rel.toColumn}
              </TableCell>
              <TableCell>
                <Badge variant="outline" className="font-mono text-[10px]">
                  {rel.joinType}
                </Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
