"use client";

import * as React from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  type Node,
  type Edge,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { TableNode, type TableNodeData } from "./table-node";

interface TableData {
  id: string;
  tableName: string;
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
    foreignTable: string | null;
    foreignColumn: string | null;
  }[];
}

interface ErdCanvasProps {
  tables: TableData[];
  onTableClick: (tableId: string) => void;
}

const nodeTypes = { table: TableNode };

const GRID_COLS = 3;
const NODE_WIDTH = 280;
const NODE_GAP_X = 80;
const NODE_GAP_Y = 40;

function layoutNodes(tables: TableData[]): Node[] {
  return tables.map((table, i) => {
    const col = i % GRID_COLS;
    const row = Math.floor(i / GRID_COLS);
    const estimatedHeight = 60 + Math.min(table.columns.length, 8) * 22 + 10;

    return {
      id: table.id,
      type: "table",
      position: {
        x: col * (NODE_WIDTH + NODE_GAP_X),
        y: row * (estimatedHeight + NODE_GAP_Y),
      },
      data: {
        label: table.tableName,
        displayName: table.displayName,
        description: table.description,
        tags: table.tags,
        columns: table.columns,
      } satisfies TableNodeData,
    };
  });
}

function buildEdges(tables: TableData[]): Edge[] {
  const tableIdByName = new Map(tables.map((t) => [t.tableName, t.id]));
  const edges: Edge[] = [];

  for (const table of tables) {
    for (const col of table.columns) {
      if (col.isForeignKey && col.foreignTable) {
        const targetId = tableIdByName.get(col.foreignTable);
        if (targetId) {
          edges.push({
            id: `${table.id}-${col.id}`,
            source: table.id,
            target: targetId,
            label: col.columnName,
            type: "default",
            style: { stroke: "hsl(var(--muted-foreground))", strokeWidth: 1.5 },
            labelStyle: { fontSize: 10, fill: "hsl(var(--muted-foreground))" },
          });
        }
      }
    }
  }

  return edges;
}

export function ErdCanvas({ tables, onTableClick }: ErdCanvasProps) {
  const nodes = React.useMemo(() => layoutNodes(tables), [tables]);
  const edges = React.useMemo(() => buildEdges(tables), [tables]);

  const handleNodeClick = React.useCallback(
    (_: React.MouseEvent, node: Node) => {
      onTableClick(node.id);
    },
    [onTableClick],
  );

  return (
    <div className="w-full h-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodeClick={handleNodeClick}
        nodesDraggable={false}
        nodesConnectable={false}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.1}
        maxZoom={2}
      >
        <Background />
        <Controls />
        <MiniMap
          nodeColor="hsl(var(--muted))"
          maskColor="hsl(var(--background) / 0.7)"
        />
      </ReactFlow>
    </div>
  );
}
