"use client";

import { memo } from "react";
import { Handle, Position, NodeResizer, type NodeProps } from "@xyflow/react";
import { Badge } from "@/components/ui/badge";
import { Key, ArrowRight } from "lucide-react";

export interface TableNodeData {
  label: string;
  displayName: string;
  description: string | null;
  tags: string[];
  columns: {
    id: string;
    columnName: string;
    displayName: string;
    dataType: string;
    isPrimaryKey: boolean;
    isForeignKey: boolean;
  }[];
  [key: string]: unknown;
}

function TableNodeComponent({ data, selected }: NodeProps) {
  const nodeData = data as unknown as TableNodeData;

  return (
    <>
      <NodeResizer
        isVisible={selected}
        minWidth={220}
        minHeight={100}
        lineClassName="!border-black"
        handleClassName="!border-black !bg-black !w-2 !h-2"
      />
      <div className="rounded-none border-2 border-black bg-card shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] w-full h-full overflow-hidden flex flex-col">
        <Handle type="target" position={Position.Left} className="!bg-primary" />
        <Handle type="source" position={Position.Right} className="!bg-primary" />

        <div className="px-3 py-2 border-b-2 border-black bg-muted/50 shrink-0">
          <div className="font-semibold text-sm truncate">
            {nodeData.displayName}
          </div>
          <div className="text-xs text-muted-foreground font-mono truncate">
            {nodeData.label}
          </div>
          {nodeData.tags.length > 0 && (
            <div className="flex gap-1 mt-1 flex-wrap">
              {nodeData.tags.map((tag) => (
                <Badge key={tag} variant="secondary" className="text-[10px] px-1 py-0">
                  {tag}
                </Badge>
              ))}
            </div>
          )}
        </div>

        <div className="px-1 py-1 overflow-y-auto min-h-0">
          {nodeData.columns.map((col) => (
            <div
              key={col.id}
              className="flex items-center gap-1.5 px-2 py-0.5 text-xs rounded hover:bg-muted/50"
            >
              {col.isPrimaryKey && (
                <Key className="size-3 text-amber-500 shrink-0" />
              )}
              {col.isForeignKey && !col.isPrimaryKey && (
                <ArrowRight className="size-3 text-blue-500 shrink-0" />
              )}
              {!col.isPrimaryKey && !col.isForeignKey && (
                <span className="size-3 shrink-0" />
              )}
              <span className="font-mono truncate">{col.columnName}</span>
              <span className="text-muted-foreground ml-auto shrink-0">
                {col.dataType}
              </span>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

export const TableNode = memo(TableNodeComponent);
