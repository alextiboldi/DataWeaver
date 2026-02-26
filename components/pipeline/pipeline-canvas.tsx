"use client";

import * as React from "react";
import { memo } from "react";
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  Handle,
  Position,
  type Node,
  type Edge,
  type NodeProps,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import type {
  MappingData,
  TableData,
  TableColumnData,
} from "@/app/(app)/pipelines/[id]/page";

/* -------------------------------------------------------------------------- */
/*  Props                                                                     */
/* -------------------------------------------------------------------------- */

interface PipelineCanvasProps {
  sourceTables: TableData[];
  destTables: TableData[];
  mappings: MappingData[];
  selectedMappingId: string | null;
  onSelectMapping: (id: string | null) => void;
}

/* -------------------------------------------------------------------------- */
/*  Custom node data types                                                    */
/* -------------------------------------------------------------------------- */

interface PipelineTableNodeData {
  label: string;
  displayName: string;
  columns: TableColumnData[];
  side: "source" | "dest";
  [key: string]: unknown;
}

interface MappingNodeData {
  mappingId: string;
  label: string;
  selected: boolean;
  [key: string]: unknown;
}

/* -------------------------------------------------------------------------- */
/*  Custom node: PipelineTableNode                                            */
/* -------------------------------------------------------------------------- */

function PipelineTableNodeComponent({ data }: NodeProps) {
  const nodeData = data as unknown as PipelineTableNodeData;
  const isSource = nodeData.side === "source";

  return (
    <div className="rounded-none border-2 border-black bg-card shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] w-[240px] overflow-hidden flex flex-col">
      {!isSource && (
        <Handle
          type="target"
          position={Position.Left}
          className="!bg-primary !w-2.5 !h-2.5"
        />
      )}
      {isSource && (
        <Handle
          type="source"
          position={Position.Right}
          className="!bg-primary !w-2.5 !h-2.5"
        />
      )}

      <div
        className={`px-3 py-2 border-b-2 border-black shrink-0 ${
          isSource ? "bg-blue-50 dark:bg-blue-950/30" : "bg-green-50 dark:bg-green-950/30"
        }`}
      >
        <div className="flex items-center gap-1.5">
          <span
            className={`text-[9px] font-bold uppercase tracking-wider px-1 py-0.5 border ${
              isSource
                ? "border-blue-300 text-blue-700 dark:border-blue-700 dark:text-blue-300"
                : "border-green-300 text-green-700 dark:border-green-700 dark:text-green-300"
            }`}
          >
            {isSource ? "SRC" : "DST"}
          </span>
          <span className="font-bold text-sm truncate">
            {nodeData.displayName}
          </span>
        </div>
        <div className="text-[10px] text-muted-foreground font-mono truncate mt-0.5">
          {nodeData.label}
        </div>
      </div>

      <div className="px-1 py-1 max-h-[160px] overflow-y-auto">
        {nodeData.columns.slice(0, 12).map((col) => (
          <div
            key={col.columnName}
            className="flex items-center gap-1.5 px-2 py-0.5 text-[11px]"
          >
            {col.isPrimaryKey && (
              <span className="text-amber-500 font-bold text-[9px]">PK</span>
            )}
            {col.isForeignKey && !col.isPrimaryKey && (
              <span className="text-blue-500 font-bold text-[9px]">FK</span>
            )}
            {!col.isPrimaryKey && !col.isForeignKey && (
              <span className="w-[16px] shrink-0" />
            )}
            <span className="font-mono truncate">{col.columnName}</span>
            <span className="text-muted-foreground ml-auto shrink-0 text-[10px]">
              {col.dataType}
            </span>
          </div>
        ))}
        {nodeData.columns.length > 12 && (
          <div className="px-2 py-0.5 text-[10px] text-muted-foreground italic">
            +{nodeData.columns.length - 12} more columns
          </div>
        )}
      </div>
    </div>
  );
}

const PipelineTableNode = memo(PipelineTableNodeComponent);

/* -------------------------------------------------------------------------- */
/*  Custom node: MappingNode                                                  */
/* -------------------------------------------------------------------------- */

function MappingNodeComponent({ data }: NodeProps) {
  const nodeData = data as unknown as MappingNodeData;

  return (
    <div
      className={`rounded-none border-2 px-3 py-2 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] cursor-pointer transition-colors ${
        nodeData.selected
          ? "border-primary bg-primary/10 ring-2 ring-primary/30"
          : "border-black bg-card hover:bg-muted/50"
      }`}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!bg-muted-foreground !w-2 !h-2"
      />
      <Handle
        type="source"
        position={Position.Right}
        className="!bg-muted-foreground !w-2 !h-2"
      />
      <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-0.5">
        Mapping
      </div>
      <div className="text-xs font-semibold truncate max-w-[140px]">
        {nodeData.label}
      </div>
    </div>
  );
}

const MappingNode = memo(MappingNodeComponent);

/* -------------------------------------------------------------------------- */
/*  Node type registry                                                        */
/* -------------------------------------------------------------------------- */

const nodeTypes = {
  pipelineTable: PipelineTableNode,
  mapping: MappingNode,
};

/* -------------------------------------------------------------------------- */
/*  Layout constants                                                          */
/* -------------------------------------------------------------------------- */

const SOURCE_X = 50;
const MAPPING_X = 370;
const DEST_X = 600;
const NODE_GAP_Y = 20;

function estimateTableHeight(columns: TableColumnData[]): number {
  const headerHeight = 52;
  const colCount = Math.min(columns.length, 12);
  const colHeight = colCount * 20;
  const overflow = columns.length > 12 ? 18 : 0;
  const padding = 8;
  return headerHeight + colHeight + overflow + padding;
}

/* -------------------------------------------------------------------------- */
/*  Build nodes and edges                                                     */
/* -------------------------------------------------------------------------- */

function buildNodes(
  sourceTables: TableData[],
  destTables: TableData[],
  mappings: MappingData[],
  selectedMappingId: string | null,
): Node[] {
  const nodes: Node[] = [];
  let sourceY = 50;
  let destY = 50;

  // Source table nodes (left column)
  for (const table of sourceTables) {
    const height = estimateTableHeight(table.columns);
    nodes.push({
      id: `src-${table.id}`,
      type: "pipelineTable",
      position: { x: SOURCE_X, y: sourceY },
      data: {
        label: table.tableName,
        displayName: table.displayName,
        columns: table.columns,
        side: "source",
      } satisfies PipelineTableNodeData,
      draggable: true,
    });
    sourceY += height + NODE_GAP_Y;
  }

  // Dest table nodes (right column)
  for (const table of destTables) {
    const height = estimateTableHeight(table.columns);
    nodes.push({
      id: `dst-${table.tableName}`,
      type: "pipelineTable",
      position: { x: DEST_X, y: destY },
      data: {
        label: table.tableName,
        displayName: table.displayName,
        columns: table.columns,
        side: "dest",
      } satisfies PipelineTableNodeData,
      draggable: true,
    });
    destY += height + NODE_GAP_Y;
  }

  // Mapping nodes (center column)
  const mappingStartY = 50;
  const mappingGap = 70;

  for (let i = 0; i < mappings.length; i++) {
    const mapping = mappings[i];
    nodes.push({
      id: `map-${mapping.id}`,
      type: "mapping",
      position: { x: MAPPING_X, y: mappingStartY + i * mappingGap },
      data: {
        mappingId: mapping.id,
        label: mapping.name,
        selected: mapping.id === selectedMappingId,
      } satisfies MappingNodeData,
      draggable: true,
    });
  }

  return nodes;
}

function buildEdges(
  sourceTables: TableData[],
  mappings: MappingData[],
  selectedMappingId: string | null,
): Edge[] {
  const edges: Edge[] = [];

  // Build a lookup: table name -> source node id
  const sourceNodeByTable = new Map<string, string>();
  for (const table of sourceTables) {
    sourceNodeByTable.set(table.tableName.toLowerCase(), `src-${table.id}`);
  }

  for (const mapping of mappings) {
    const isSelected = mapping.id === selectedMappingId;
    const mappingNodeId = `map-${mapping.id}`;
    const destNodeId = `dst-${mapping.destTable}`;

    // Try to find a source table reference in the sourceQuery
    // Look for FROM/JOIN table references (simple heuristic)
    let sourceNodeId: string | null = null;
    if (mapping.sourceQuery) {
      const queryLower = mapping.sourceQuery.toLowerCase();
      for (const [tableName, nodeId] of sourceNodeByTable) {
        if (queryLower.includes(tableName)) {
          sourceNodeId = nodeId;
          break;
        }
      }
    }

    // Edge from source table to mapping node (if we found a match)
    if (sourceNodeId) {
      edges.push({
        id: `edge-src-${mapping.id}`,
        source: sourceNodeId,
        target: mappingNodeId,
        type: "default",
        animated: isSelected,
        style: {
          stroke: isSelected
            ? "hsl(var(--primary))"
            : "var(--muted-foreground)",
          strokeWidth: isSelected ? 2.5 : 1.5,
          opacity: selectedMappingId && !isSelected ? 0.3 : 1,
        },
      });
    }

    // Edge from mapping node to dest table node
    edges.push({
      id: `edge-dst-${mapping.id}`,
      source: mappingNodeId,
      target: destNodeId,
      type: "default",
      animated: isSelected,
      style: {
        stroke: isSelected
          ? "hsl(var(--primary))"
          : "var(--muted-foreground)",
        strokeWidth: isSelected ? 2.5 : 1.5,
        opacity: selectedMappingId && !isSelected ? 0.3 : 1,
      },
      label: isSelected ? mapping.name : undefined,
      labelStyle: {
        fontSize: 10,
        fontWeight: 600,
        fill: "hsl(var(--primary))",
      },
    });
  }

  return edges;
}

/* -------------------------------------------------------------------------- */
/*  Inner canvas (requires ReactFlowProvider above)                           */
/* -------------------------------------------------------------------------- */

function PipelineCanvasInner({
  sourceTables,
  destTables,
  mappings,
  selectedMappingId,
  onSelectMapping,
}: PipelineCanvasProps) {
  const initialNodes = React.useMemo(
    () => buildNodes(sourceTables, destTables, mappings, selectedMappingId),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sourceTables, destTables, mappings],
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);

  // Update mapping node "selected" data when selectedMappingId changes
  React.useEffect(() => {
    setNodes((nds) =>
      nds.map((node) => {
        if (node.type !== "mapping") return node;
        const nd = node.data as unknown as MappingNodeData;
        const shouldBeSelected = nd.mappingId === selectedMappingId;
        if (nd.selected === shouldBeSelected) return node;
        return {
          ...node,
          data: { ...node.data, selected: shouldBeSelected },
        };
      }),
    );
  }, [selectedMappingId, setNodes]);

  const edges = React.useMemo(
    () => buildEdges(sourceTables, mappings, selectedMappingId),
    [sourceTables, mappings, selectedMappingId],
  );

  const handleNodeClick = React.useCallback(
    (_: React.MouseEvent, node: Node) => {
      if (node.type === "mapping") {
        const nd = node.data as unknown as MappingNodeData;
        // Toggle: click again to deselect
        onSelectMapping(nd.mappingId === selectedMappingId ? null : nd.mappingId);
      }
    },
    [onSelectMapping, selectedMappingId],
  );

  const handleEdgeClick = React.useCallback(
    (_: React.MouseEvent, edge: Edge) => {
      // Edge IDs are edge-src-{mappingId} or edge-dst-{mappingId}
      const mappingId = edge.id.replace(/^edge-(src|dst)-/, "");
      onSelectMapping(mappingId === selectedMappingId ? null : mappingId);
    },
    [onSelectMapping, selectedMappingId],
  );

  const handlePaneClick = React.useCallback(() => {
    onSelectMapping(null);
  }, [onSelectMapping]);

  return (
    <div className="w-full h-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onNodeClick={handleNodeClick}
        onEdgeClick={handleEdgeClick}
        onPaneClick={handlePaneClick}
        nodesConnectable={false}
        fitView
        fitViewOptions={{ padding: 0.3 }}
        minZoom={0.1}
        maxZoom={2}
      >
        <Background />
        <Controls />
        <MiniMap
          nodeColor={(node) => {
            if (node.type === "mapping") return "hsl(var(--primary))";
            const nd = node.data as unknown as PipelineTableNodeData;
            if (nd.side === "source") return "hsl(210 80% 70%)";
            return "hsl(140 60% 65%)";
          }}
          maskColor="hsl(var(--background) / 0.7)"
        />
      </ReactFlow>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Exported component (with provider wrapper)                                */
/* -------------------------------------------------------------------------- */

export function PipelineCanvas(props: PipelineCanvasProps): React.ReactElement {
  // If no tables and no mappings, show empty state
  if (
    props.sourceTables.length === 0 &&
    props.destTables.length === 0 &&
    props.mappings.length === 0
  ) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        No tables or mappings to display. Connect data sources with documented schemas.
      </div>
    );
  }

  return (
    <ReactFlowProvider>
      <PipelineCanvasInner {...props} />
    </ReactFlowProvider>
  );
}
