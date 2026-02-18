import pg from "pg";
import type { SchemaInfo, SchemaTable, SchemaColumn } from "@/lib/types/toolbox";

export async function introspectDirect(
  connectionUri: string,
): Promise<SchemaInfo> {
  const pool = new pg.Pool({ connectionString: connectionUri });

  try {
    const tablesRes = await pool.query<{ table_name: string }>(
      `SELECT table_name FROM information_schema.tables
       WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
       ORDER BY table_name`,
    );

    const tables: SchemaTable[] = [];

    for (const { table_name } of tablesRes.rows) {
      const columnsRes = await pool.query<{
        column_name: string;
        data_type: string;
        is_nullable: string;
        column_default: string | null;
      }>(
        `SELECT column_name, data_type, is_nullable, column_default
         FROM information_schema.columns
         WHERE table_schema = 'public' AND table_name = $1
         ORDER BY ordinal_position`,
        [table_name],
      );

      const fkRes = await pool.query<{
        column_name: string;
        foreign_table_name: string;
        foreign_column_name: string;
      }>(
        `SELECT
           kcu.column_name,
           ccu.table_name  AS foreign_table_name,
           ccu.column_name AS foreign_column_name
         FROM information_schema.table_constraints tc
         JOIN information_schema.key_column_usage kcu
           ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema   = kcu.table_schema
         JOIN information_schema.constraint_column_usage ccu
           ON tc.constraint_name = ccu.constraint_name
          AND tc.table_schema   = ccu.table_schema
         WHERE tc.constraint_type = 'FOREIGN KEY'
           AND tc.table_schema = 'public'
           AND tc.table_name = $1`,
        [table_name],
      );

      const fkMap = new Map(
        fkRes.rows.map((fk) => [
          fk.column_name,
          { table: fk.foreign_table_name, column: fk.foreign_column_name },
        ]),
      );

      const columns: SchemaColumn[] = columnsRes.rows.map((col) => ({
        columnName: col.column_name,
        dataType: col.data_type,
        isNullable: col.is_nullable === "YES",
        columnDefault: col.column_default,
        foreignKey: fkMap.get(col.column_name) ?? null,
      }));

      tables.push({ tableName: table_name, columns });
    }

    return { tables };
  } finally {
    await pool.end();
  }
}
