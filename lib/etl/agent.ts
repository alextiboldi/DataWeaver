import { google } from "@ai-sdk/google";
import {
  streamText,
  convertToModelMessages,
  stepCountIs,
  tool,
  type UIMessage,
} from "ai";
import { z } from "zod";
import prisma from "@/lib/db";
import { validateQuery } from "@/lib/agent/validation";
import { formatQueryResult } from "@/lib/agent/formatter";
import { getToolboxClient } from "@/lib/toolbox/client";

interface SchemaTable {
  tableName: string;
  displayName: string;
  description: string | null;
  columns: {
    columnName: string;
    displayName: string;
    description: string | null;
    dataType: string;
    isPrimaryKey: boolean;
    isForeignKey: boolean;
  }[];
}

function formatSchemaSection(
  label: string,
  tables: SchemaTable[]
): string {
  return tables
    .map((t) => {
      const header = `${label} Table: ${t.tableName} (${t.displayName})`;
      const desc = t.description ? `${t.description}\n` : "";
      const cols = t.columns
        .map((c) => {
          const flags = [
            c.isPrimaryKey ? "[PK]" : "",
            c.isForeignKey ? "[FK]" : "",
          ]
            .filter(Boolean)
            .join(" ");
          const colDesc = c.description ? ` — ${c.description}` : "";
          return `  - ${c.columnName} (${c.dataType}) ${flags}${colDesc}`;
        })
        .join("\n");
      return `${header}\n${desc}${cols}`;
    })
    .join("\n\n");
}

function buildEtlSystemPrompt(
  sourceTables: SchemaTable[],
  destTables: SchemaTable[]
): string {
  return `You are an ETL mapping assistant for DataWeaver. You help users create data mappings between a source database and a destination database.

## Source Database Schema
${formatSchemaSection("SOURCE", sourceTables)}

## Destination Database Schema
${formatSchemaSection("DEST", destTables)}

## Rules
1. Use the createMapping tool to create new mappings between source and destination tables.
2. The sourceQuery must be a valid PostgreSQL SELECT statement.
3. columnMappings maps SELECT aliases (keys) to destination column names (values).
4. Choose the appropriate conflictStrategy: "insert" for append-only, "upsert" for update-or-insert, "replace" for full refresh.
5. Use aggregations (GROUP BY, SUM, AVG, etc.) in sourceQuery when the destination expects summarized data.
6. When the user describes what data they want to move, suggest appropriate mappings with column transformations.
7. Use previewQuery to test and validate source queries before creating mappings.
8. Always explain what each mapping does after creating it.
9. If column types differ between source and destination, include appropriate CAST expressions in the sourceQuery.`;
}

export async function createEtlAgentStream(
  pipelineId: string,
  messages: UIMessage[],
  sourceTables: SchemaTable[],
  destTables: SchemaTable[]
) {
  const systemPrompt = buildEtlSystemPrompt(sourceTables, destTables);

  const etlTools = {
    createMapping: tool({
      description:
        "Create a new ETL mapping that defines how data flows from a source query to a destination table.",
      inputSchema: z.object({
        name: z.string().describe("Human-readable name for this mapping"),
        sourceQuery: z
          .string()
          .describe("PostgreSQL SELECT query to extract data from the source"),
        destTable: z
          .string()
          .describe("Destination table name to load data into"),
        columnMappings: z
          .record(z.string(), z.string())
          .describe(
            "Maps SELECT aliases (keys) to destination column names (values)"
          ),
        conflictStrategy: z
          .enum(["insert", "upsert", "replace"])
          .default("insert")
          .describe("How to handle conflicts: insert, upsert, or replace"),
      }),
      execute: async ({
        name,
        sourceQuery,
        destTable,
        columnMappings,
        conflictStrategy,
      }) => {
        const maxOrder = await prisma.etlMapping.aggregate({
          where: { pipelineId },
          _max: { orderIndex: true },
        });
        const nextOrder = (maxOrder._max.orderIndex ?? -1) + 1;

        const mapping = await prisma.etlMapping.create({
          data: {
            pipelineId,
            name,
            sourceQuery,
            destTable,
            columnMappings,
            conflictStrategy,
            orderIndex: nextOrder,
          },
        });

        return {
          success: true,
          mappingId: mapping.id,
          name: mapping.name,
          orderIndex: mapping.orderIndex,
        };
      },
    }),

    updateMapping: tool({
      description: "Update an existing ETL mapping by its ID.",
      inputSchema: z.object({
        mappingId: z.string().describe("The ID of the mapping to update"),
        name: z.string().optional().describe("New name for the mapping"),
        sourceQuery: z
          .string()
          .optional()
          .describe("New source query"),
        destTable: z
          .string()
          .optional()
          .describe("New destination table"),
        columnMappings: z
          .record(z.string(), z.string())
          .optional()
          .describe("New column mappings"),
        conflictStrategy: z
          .enum(["insert", "upsert", "replace"])
          .optional()
          .describe("New conflict strategy"),
      }),
      execute: async ({ mappingId, ...fields }) => {
        const data: Record<string, unknown> = {};
        if (fields.name !== undefined) data.name = fields.name;
        if (fields.sourceQuery !== undefined)
          data.sourceQuery = fields.sourceQuery;
        if (fields.destTable !== undefined) data.destTable = fields.destTable;
        if (fields.columnMappings !== undefined)
          data.columnMappings = fields.columnMappings;
        if (fields.conflictStrategy !== undefined)
          data.conflictStrategy = fields.conflictStrategy;

        try {
          const mapping = await prisma.etlMapping.update({
            where: { id: mappingId },
            data,
          });
          return { success: true, mappingId: mapping.id, updated: data };
        } catch {
          return { success: false, error: "Mapping not found" };
        }
      },
    }),

    deleteMapping: tool({
      description: "Delete an ETL mapping by its ID.",
      inputSchema: z.object({
        mappingId: z.string().describe("The ID of the mapping to delete"),
      }),
      execute: async ({ mappingId }) => {
        try {
          await prisma.etlMapping.delete({ where: { id: mappingId } });
          return { success: true, deletedId: mappingId };
        } catch {
          return { success: false, error: "Mapping not found" };
        }
      },
    }),

    previewQuery: tool({
      description:
        "Validate and execute a read-only SQL query against the source database to preview the results.",
      inputSchema: z.object({
        sql: z
          .string()
          .describe("PostgreSQL SELECT query to preview"),
      }),
      execute: async ({ sql }) => {
        const validation = validateQuery(sql);
        if (!validation.valid) {
          return {
            error: true,
            message: validation.reason,
            suggestion: "Please provide a valid read-only SELECT query.",
          };
        }

        const client = getToolboxClient();
        try {
          const result = await client.executeTool("execute-sql", { sql });
          const formatted = formatQueryResult(result);
          return { error: false, ...formatted };
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          return {
            error: true,
            message: `Query execution failed: ${message}`,
            suggestion: "Review the SQL syntax and try again.",
          };
        }
      },
    }),
  };

  return streamText({
    model: google("gemini-2.5-flash"),
    system: systemPrompt,
    messages: await convertToModelMessages(messages),
    tools: etlTools,
    stopWhen: stepCountIs(10),
  });
}
