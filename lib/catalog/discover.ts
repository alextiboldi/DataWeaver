import prisma from "@/lib/db";
import { introspectDirect } from "./direct-introspect";
import { computeFingerprint } from "./fingerprint";
import { humanize } from "./utils";

export async function discoverAndSync(
  connectionUri: string,
  name: string,
  connectionParams?: Record<string, unknown>,
  type?: string
) {
  const fingerprint = computeFingerprint(connectionUri, connectionParams, type);
  const schema = await introspectDirect(connectionUri);

  const databaseDoc = await prisma.databaseDoc.upsert({
    where: { fingerprint },
    create: {
      fingerprint,
      name,
    },
    update: {},
  });

  for (const table of schema.tables) {
    const tableDoc = await prisma.tableDoc.upsert({
      where: {
        databaseDocId_tableName: {
          databaseDocId: databaseDoc.id,
          tableName: table.tableName,
        },
      },
      create: {
        databaseDocId: databaseDoc.id,
        tableName: table.tableName,
        displayName: humanize(table.tableName),
        tags: [],
      },
      update: {},
    });

    for (const col of table.columns) {
      await prisma.columnDoc.upsert({
        where: {
          tableDocId_columnName: {
            tableDocId: tableDoc.id,
            columnName: col.columnName,
          },
        },
        create: {
          tableDocId: tableDoc.id,
          columnName: col.columnName,
          displayName: humanize(col.columnName),
          dataType: col.dataType,
          nullable: col.isNullable,
          isPrimaryKey: false,
          isForeignKey: col.foreignKey !== null,
          foreignTable: col.foreignKey?.table ?? null,
          foreignColumn: col.foreignKey?.column ?? null,
        },
        update: {
          dataType: col.dataType,
          nullable: col.isNullable,
          isForeignKey: col.foreignKey !== null,
          foreignTable: col.foreignKey?.table ?? null,
          foreignColumn: col.foreignKey?.column ?? null,
        },
      });
    }
  }

  return databaseDoc;
}
