"use client";

import * as React from "react";
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useReactFlow,
  type Node,
  type Edge,
  type NodeChange,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { TableNode, type TableNodeData } from "./table-node";
import type { ErdLayout } from "@/lib/types/api";

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
  erdLayout: ErdLayout | null;
  catalogId: string;
}

const nodeTypes = { table: TableNode };

const GRID_COLS = 3;
const NODE_WIDTH = 280;
const NODE_GAP_X = 80;
const NODE_GAP_Y = 40;

function buildInitialNodes(
  tables: TableData[],
  erdLayout: ErdLayout | null,
): Node[] {
  return tables.map((table, i) => {
    const saved = erdLayout?.[table.id];
    const col = i % GRID_COLS;
    const row = Math.floor(i / GRID_COLS);
    const estimatedHeight = 60 + Math.min(table.columns.length, 8) * 22 + 10;

    return {
      id: table.id,
      type: "table",
      position: saved
        ? { x: saved.x, y: saved.y }
        : {
            x: col * (NODE_WIDTH + NODE_GAP_X),
            y: row * (estimatedHeight + NODE_GAP_Y),
          },
      ...(saved ? { width: saved.w, height: saved.h } : {}),
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
            style: {
              stroke: "var(--muted-foreground)",
              strokeWidth: 1.5,
            },
            labelStyle: {
              fontSize: 10,
              fill: "var(--muted-foreground)",
            },
          });
        }
      }
    }
  }

  return edges;
}

function ErdCanvasInner({
  tables,
  onTableClick,
  erdLayout,
  catalogId,
}: ErdCanvasProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState(
    buildInitialNodes(tables, erdLayout),
  );
  const edges = React.useMemo(() => buildEdges(tables), [tables]);
  const { getNodes } = useReactFlow();
  const saveTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const saveLayout = React.useCallback(() => {
    const currentNodes = getNodes();
    const layout: ErdLayout = {};
    for (const node of currentNodes) {
      layout[node.id] = {
        x: node.position.x,
        y: node.position.y,
        w: node.measured?.width ?? node.width ?? NODE_WIDTH,
        h:
          node.measured?.height ??
          node.height ??
          60 + 8 * 22 + 10,
      };
    }

    fetch(`/api/catalog/${catalogId}/layout`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ layout }),
    });
  }, [getNodes, catalogId]);

  const debouncedSave = React.useCallback(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(saveLayout, 500);
  }, [saveLayout]);

  React.useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, []);

  const handleNodesChange = React.useCallback(
    (changes: NodeChange[]) => {
      onNodesChange(changes);

      const shouldSave = changes.some(
        (c) =>
          (c.type === "position" && !c.dragging) ||
          (c.type === "dimensions" && c.resizing === false),
      );
      if (shouldSave) {
        debouncedSave();
      }
    },
    [onNodesChange, debouncedSave],
  );

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
        onNodesChange={handleNodesChange}
        onNodeClick={handleNodeClick}
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

export function ErdCanvas(props: ErdCanvasProps) {
  return (
    <ReactFlowProvider>
      <ErdCanvasInner {...props} />
    </ReactFlowProvider>
  );
}
