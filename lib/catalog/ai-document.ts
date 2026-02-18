import { google } from "@ai-sdk/google";
import { generateText } from "ai";
import prisma from "@/lib/db";

export async function aiDocumentTable(tableDocId: string) {
  const tableDoc = await prisma.tableDoc.findUniqueOrThrow({
    where: { id: tableDocId },
    include: {
      columns: true,
      databaseDoc: {
        include: {
          tables: { select: { tableName: true } },
        },
      },
    },
  });

  const siblingTables = tableDoc.databaseDoc.tables
    .map((t) => t.tableName)
    .filter((n) => n !== tableDoc.tableName);

  const columnsDescription = tableDoc.columns
    .map(
      (c) =>
        `- ${c.columnName} (${c.dataType}${c.nullable ? ", nullable" : ""}${c.isForeignKey ? `, FK → ${c.foreignTable}.${c.foreignColumn}` : ""})`,
    )
    .join("\n");

  const { text } = await generateText({
    model: google("gemini-2.5-flash"),
    prompt: `You are a data documentation expert. Given a database table and its columns, generate clear business-friendly descriptions.

Database context - other tables in this database: ${siblingTables.join(", ")}

Table: ${tableDoc.tableName}
Columns:
${columnsDescription}

Return a JSON object with this exact structure (no markdown, just JSON):
{
  "tableDisplayName": "Human-friendly name for the table",
  "tableDescription": "1-2 sentence business description of what this table stores",
  "columns": [
    {
      "columnName": "exact_column_name",
      "displayName": "Human-Friendly Name",
      "description": "Brief business description of this column"
    }
  ]
}

Include ALL columns from the input. Be specific and business-oriented in descriptions.`,
  });

  const cleaned = text.replace(/```json\n?|\n?```/g, "").trim();
  const result = JSON.parse(cleaned) as {
    tableDisplayName: string;
    tableDescription: string;
    columns: {
      columnName: string;
      displayName: string;
      description: string;
    }[];
  };

  await prisma.tableDoc.update({
    where: { id: tableDocId },
    data: {
      displayName: result.tableDisplayName,
      description: result.tableDescription,
    },
  });

  for (const col of result.columns) {
    await prisma.columnDoc.updateMany({
      where: {
        tableDocId,
        columnName: col.columnName,
      },
      data: {
        displayName: col.displayName,
        description: col.description,
      },
    });
  }

  return result;
}

export async function aiDocumentAll(dbDocId: string) {
  const tables = await prisma.tableDoc.findMany({
    where: {
      databaseDocId: dbDocId,
      description: null,
    },
  });

  let documented = 0;
  let skipped = 0;

  for (const table of tables) {
    try {
      await aiDocumentTable(table.id);
      documented++;
    } catch {
      skipped++;
    }
  }

  return { documented, skipped };
}
