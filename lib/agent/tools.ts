import { tool } from "ai";
import { z } from "zod";
import { getToolboxClient } from "@/lib/toolbox/client";
import { validateQuery } from "./validation";
import { formatQueryResult } from "./formatter";

export const agentTools = {
  executeQuery: tool({
    description:
      "Execute a read-only SQL query against the connected PostgreSQL database and return the results.",
    inputSchema: z.object({
      sql: z.string().describe("The PostgreSQL SQL query to execute"),
      title: z
        .string()
        .optional()
        .describe(
          "Very short title, max 5 words (e.g. 'Top Sales by Revenue'). Do NOT repeat the explanation."
        ),
      explanation: z
        .string()
        .describe("A brief explanation of what this query does and why"),
    }),
    execute: async ({ sql, title, explanation }) => {
      const validation = validateQuery(sql);
      if (!validation.valid) {
        return {
          error: true,
          message: validation.reason,
          suggestion: "Please generate a read-only SELECT query instead.",
        };
      }

      const client = getToolboxClient();
      try {
        const result = await client.executeTool("execute-sql", { sql });
        const formatted = formatQueryResult(result);
        return {
          error: false,
          title,
          explanation,
          ...formatted,
        };
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return {
          error: true,
          message: `Query execution failed: ${message}`,
          failedSql: sql,
          suggestion: "Review the SQL syntax and try again.",
        };
      }
    },
  }),

  getSchema: tool({
    description:
      "Get the database schema including table names, column names, types, and foreign key relationships. Use this to understand the data structure before writing queries.",
    inputSchema: z.object({
      tableFilter: z
        .string()
        .optional()
        .describe("Optional: filter to a specific table name"),
    }),
    execute: async ({ tableFilter }) => {
      const client = getToolboxClient();

      if (tableFilter) {
        const result = await client.executeTool("describe-table", {
          table_name: tableFilter,
        });
        const fks = await client.executeTool("get-foreign-keys", {
          table_name: tableFilter,
        });
        return {
          table: tableFilter,
          columns: result.rows,
          foreignKeys: fks.rows,
        };
      }

      const tables = await client.executeTool("list-tables");
      return { tables: tables.rows };
    },
  }),

  renderUI: tool({
    description:
      "Render a rich UI composition in the chat. Use this after executing queries to present results as composed layouts with charts, metrics, and tables. The spec uses a flat element tree: { root: '<key>', elements: { '<key>': { type, props, children? } } }. Only use components from the catalog.",
    inputSchema: z.object({
      spec: z
        .record(z.string(), z.unknown())
        .describe(
          'A json-render spec with "root" (string key) and "elements" (Record<string, { type, props, children? }>)'
        ),
      title: z
        .string()
        .optional()
        .describe("Optional title for the rendered block"),
    }),
    execute: async ({ spec, title }) => {
      return { type: "ui-render" as const, spec, title };
    },
  }),

  compareQueries: tool({
    description:
      "Execute two SQL queries simultaneously and return results side-by-side for comparison. Useful for period-over-period analysis or segment comparisons.",
    inputSchema: z.object({
      queryA: z.object({
        sql: z.string().describe("First SQL query to execute"),
        label: z.string().describe("Label for the first query results (e.g. 'This Month')"),
      }),
      queryB: z.object({
        sql: z.string().describe("Second SQL query to execute"),
        label: z.string().describe("Label for the second query results (e.g. 'Last Month')"),
      }),
    }),
    execute: async ({ queryA, queryB }) => {
      const validationA = validateQuery(queryA.sql);
      if (!validationA.valid) {
        return {
          error: true,
          message: `Query A validation failed: ${validationA.reason}`,
          suggestion: "Please generate a read-only SELECT query.",
        };
      }

      const validationB = validateQuery(queryB.sql);
      if (!validationB.valid) {
        return {
          error: true,
          message: `Query B validation failed: ${validationB.reason}`,
          suggestion: "Please generate a read-only SELECT query.",
        };
      }

      const client = getToolboxClient();

      try {
        const [resultA, resultB] = await Promise.all([
          client.executeTool("execute-sql", { sql: queryA.sql }),
          client.executeTool("execute-sql", { sql: queryB.sql }),
        ]);

        const formattedA = formatQueryResult(resultA);
        const formattedB = formatQueryResult(resultB);

        return {
          error: false,
          comparison: {
            a: {
              label: queryA.label,
              sql: queryA.sql,
              ...formattedA,
            },
            b: {
              label: queryB.label,
              sql: queryB.sql,
              ...formattedB,
            },
          },
        };
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return {
          error: true,
          message: `Comparison query failed: ${message}`,
          suggestion: "Review the SQL syntax for both queries and try again.",
        };
      }
    },
  }),
};
