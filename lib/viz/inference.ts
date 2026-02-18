import type { QueryResponse, QueryColumn } from "@/lib/types/api";

export type ChartType = "bar" | "line" | "pie" | "scatter" | "area" | "table";

interface ColumnClassification {
  text: QueryColumn[];
  numeric: QueryColumn[];
  date: QueryColumn[];
  boolean: QueryColumn[];
  other: QueryColumn[];
}

export function classifyColumns(columns: QueryColumn[]): ColumnClassification {
  const result: ColumnClassification = {
    text: [],
    numeric: [],
    date: [],
    boolean: [],
    other: [],
  };

  for (const col of columns) {
    const t = col.type.toLowerCase();
    if (
      t === "text" ||
      t === "varchar" ||
      t === "char" ||
      t === "character varying" ||
      t === "name" ||
      t === "citext" ||
      t === "uuid"
    ) {
      result.text.push(col);
    } else if (
      t === "integer" ||
      t === "int" ||
      t === "bigint" ||
      t === "smallint" ||
      t === "decimal" ||
      t === "numeric" ||
      t === "real" ||
      t === "double precision" ||
      t === "float" ||
      t === "money" ||
      t === "serial" ||
      t === "bigserial"
    ) {
      result.numeric.push(col);
    } else if (
      t === "date" ||
      t === "timestamp" ||
      t === "timestamp with time zone" ||
      t === "timestamp without time zone" ||
      t === "timestamptz" ||
      t === "time" ||
      t === "interval"
    ) {
      result.date.push(col);
    } else if (t === "boolean" || t === "bool") {
      result.boolean.push(col);
    } else {
      result.other.push(col);
    }
  }

  return result;
}

export function looksLikePercentages(
  rows: Record<string, unknown>[],
  numericCol: QueryColumn,
): boolean {
  if (rows.length === 0 || rows.length > 20) return false;

  const values = rows.map((row) => {
    const val = row[numericCol.name];
    return typeof val === "number" ? val : parseFloat(String(val));
  });

  if (values.some((v) => isNaN(v))) return false;

  const allPositive = values.every((v) => v >= 0);
  const sum = values.reduce((a, b) => a + b, 0);

  return allPositive && sum >= 90 && sum <= 110;
}

export function inferChartType(data: QueryResponse): ChartType {
  if (data.columns.length === 0 || data.rows.length === 0) {
    return "table";
  }

  const classified = classifyColumns(data.columns);

  // 1 text/categorical + 1 numeric that sums to ~100% -> pie
  if (
    classified.text.length === 1 &&
    classified.numeric.length === 1 &&
    classified.date.length === 0
  ) {
    if (looksLikePercentages(data.rows, classified.numeric[0])) {
      return "pie";
    }
    // 1 text + 1 numeric -> bar
    return "bar";
  }

  // 1 date/timestamp + 1 numeric -> line
  if (
    classified.date.length === 1 &&
    classified.numeric.length === 1 &&
    classified.text.length === 0
  ) {
    return "line";
  }

  // 1 date + multiple numerics -> area
  if (
    classified.date.length === 1 &&
    classified.numeric.length > 1
  ) {
    return "area";
  }

  // 2 numerics (no text, no date) -> scatter
  if (
    classified.numeric.length === 2 &&
    classified.text.length === 0 &&
    classified.date.length === 0
  ) {
    return "scatter";
  }

  // 1 text + multiple numerics -> bar (grouped)
  if (
    classified.text.length === 1 &&
    classified.numeric.length >= 1 &&
    classified.date.length === 0
  ) {
    return "bar";
  }

  // 1 date + 1 numeric + text dimensions -> line
  if (classified.date.length === 1 && classified.numeric.length >= 1) {
    return "line";
  }

  // 2+ numerics with anything else -> scatter
  if (classified.numeric.length >= 2) {
    return "scatter";
  }

  // Fallback
  return "table";
}
