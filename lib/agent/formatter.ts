import type { ToolboxToolResult } from "@/lib/types/toolbox";
import type { QueryResponse } from "@/lib/types/api";

export function formatQueryResult(result: ToolboxToolResult): QueryResponse {
  const firstRow = result.rows[0];
  const columns = firstRow
    ? Object.keys(firstRow).map((name) => ({
        name,
        type: inferColumnType(firstRow[name]),
      }))
    : [];

  return {
    columns,
    rows: result.rows,
    rowCount: result.rows.length,
    executionMs: 0,
  };
}

function inferColumnType(value: unknown): string {
  if (value === null || value === undefined) return "unknown";
  if (typeof value === "number") {
    return Number.isInteger(value) ? "integer" : "decimal";
  }
  if (typeof value === "boolean") return "boolean";
  if (value instanceof Date) return "timestamp";
  if (typeof value === "string") {
    if (/^\d{4}-\d{2}-\d{2}/.test(value)) return "date";
    return "text";
  }
  return "json";
}
