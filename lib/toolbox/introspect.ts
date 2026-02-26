import { getToolboxClient } from "./client";
import type { SchemaInfo, SchemaTable, SchemaColumn } from "@/lib/types/toolbox";

export async function introspectSchema(toolboxId: string = "sample-pg"): Promise<SchemaInfo> {
  const client = getToolboxClient();

  const tablesResult = await client.executeTool(`${toolboxId}-list-tables`);
  const tableNames = tablesResult.rows.map(
    (r) => r.table_name as string
  );

  const tables: SchemaTable[] = [];

  for (const tableName of tableNames) {
    const columnsResult = await client.executeTool(`${toolboxId}-describe-table`, {
      table_name: tableName,
    });

    const fkResult = await client.executeTool(`${toolboxId}-get-foreign-keys`, {
      table_name: tableName,
    });

    const fkMap = new Map(
      fkResult.rows.map((fk) => [
        fk.column_name as string,
        {
          table: fk.foreign_table_name as string,
          column: fk.foreign_column_name as string,
        },
      ])
    );

    const columns: SchemaColumn[] = columnsResult.rows.map((col) => ({
      columnName: col.column_name as string,
      dataType: col.data_type as string,
      isNullable: col.is_nullable === "YES",
      columnDefault: col.column_default as string | null,
      foreignKey: fkMap.get(col.column_name as string) || null,
    }));

    tables.push({ tableName, columns });
  }

  return { tables };
}
