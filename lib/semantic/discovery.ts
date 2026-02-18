import { introspectSchema } from "@/lib/toolbox/introspect";
import type { TableMeta, JoinPath } from "@/lib/types/api";
import { humanize } from "@/lib/catalog/utils";

export interface DiscoveryResult {
  tables: TableMeta[];
  relationships: JoinPath[];
  tablesFound: number;
  columnsFound: number;
}

export async function discoverSemanticModel(): Promise<DiscoveryResult> {
  const schema = await introspectSchema();

  const tables: TableMeta[] = schema.tables.map((table) => ({
    name: table.tableName,
    displayName: humanize(table.tableName),
    description: `The ${humanize(table.tableName).toLowerCase()} table`,
    columns: table.columns.map((col) => ({
      name: col.columnName,
      displayName: humanize(col.columnName),
      description: `${humanize(col.columnName)} (${col.dataType})`,
      type: col.dataType,
      isPrimaryKey: false,
      isForeignKey: col.foreignKey !== null,
      referencesTable: col.foreignKey?.table,
      referencesColumn: col.foreignKey?.column,
    })),
  }));

  const relationships: JoinPath[] = schema.tables.flatMap((table) =>
    table.columns
      .filter((col) => col.foreignKey)
      .map((col) => ({
        fromTable: table.tableName,
        fromColumn: col.columnName,
        toTable: col.foreignKey!.table,
        toColumn: col.foreignKey!.column,
        joinType: "inner" as const,
      })),
  );

  return {
    tables,
    relationships,
    tablesFound: tables.length,
    columnsFound: tables.reduce((sum, t) => sum + t.columns.length, 0),
  };
}
