# ETL Pipelines Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add ETL pipeline support — users visually map columns between two data sources (with LLM assistance), and export executable SQL scripts.

**Architecture:** New Prisma models (EtlPipeline, EtlMapping) with full CRUD API routes. Pipeline editor page has three panels: XY Flow canvas showing source→dest table mappings, a detail panel for editing individual mappings, and a chat sidebar where the LLM creates/updates mappings via tool calls. SQL export generates INSERT/UPSERT scripts — DataWeaver never executes writes.

**Tech Stack:** Prisma 7, Next.js 16 App Router, @xyflow/react, Vercel AI SDK + Google Gemini, Tanstack Query, Shadcn UI, Zod

---

## Task 1: Prisma Schema — Add EtlPipeline and EtlMapping Models

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/<timestamp>_add_etl_pipeline/migration.sql`

**Step 1: Add models to Prisma schema**

Add after the last model in `prisma/schema.prisma`:

```prisma
model EtlPipeline {
  id                 String   @id @default(cuid())
  name               String
  description        String?
  sourceDataSourceId String
  sourceDataSource   DataSource @relation("EtlPipelineSource", fields: [sourceDataSourceId], references: [id])
  destDataSourceId   String
  destDataSource     DataSource @relation("EtlPipelineDest", fields: [destDataSourceId], references: [id])
  status             String   @default("draft") // "draft" | "ready"
  createdAt          DateTime @default(now())
  updatedAt          DateTime @updatedAt

  mappings    EtlMapping[]
  conversation Conversation? @relation(fields: [conversationId], references: [id])
  conversationId String?
}

model EtlMapping {
  id               String   @id @default(cuid())
  pipelineId       String
  pipeline         EtlPipeline @relation(fields: [pipelineId], references: [id], onDelete: Cascade)
  name             String
  sourceQuery      String   @default("")
  destTable        String
  columnMappings   Json     @default("{}")
  conflictStrategy String   @default("insert") // "insert" | "upsert" | "replace"
  orderIndex       Int      @default(0)
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt
}
```

Also add the reverse relations to the `DataSource` model (after `dashboards Dashboard[]`):

```prisma
  etlPipelinesAsSource EtlPipeline[] @relation("EtlPipelineSource")
  etlPipelinesAsDest   EtlPipeline[] @relation("EtlPipelineDest")
```

And add to the `Conversation` model:

```prisma
  etlPipelines EtlPipeline[]
```

**Step 2: Create migration file**

Create directory `prisma/migrations/<timestamp>_add_etl_pipeline/` with `migration.sql`:

```sql
CREATE TABLE "EtlPipeline" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "sourceDataSourceId" TEXT NOT NULL,
    "destDataSourceId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "conversationId" TEXT,
    CONSTRAINT "EtlPipeline_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "EtlMapping" (
    "id" TEXT NOT NULL,
    "pipelineId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sourceQuery" TEXT NOT NULL DEFAULT '',
    "destTable" TEXT NOT NULL,
    "columnMappings" JSONB NOT NULL DEFAULT '{}',
    "conflictStrategy" TEXT NOT NULL DEFAULT 'insert',
    "orderIndex" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "EtlMapping_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "EtlPipeline" ADD CONSTRAINT "EtlPipeline_sourceDataSourceId_fkey" FOREIGN KEY ("sourceDataSourceId") REFERENCES "DataSource"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "EtlPipeline" ADD CONSTRAINT "EtlPipeline_destDataSourceId_fkey" FOREIGN KEY ("destDataSourceId") REFERENCES "DataSource"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "EtlPipeline" ADD CONSTRAINT "EtlPipeline_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "EtlMapping" ADD CONSTRAINT "EtlMapping_pipelineId_fkey" FOREIGN KEY ("pipelineId") REFERENCES "EtlPipeline"("id") ON DELETE CASCADE ON UPDATE CASCADE;
```

**Step 3: Generate Prisma client**

Run: `npx prisma generate`
Expected: `Generated Prisma Client`

**Step 4: Verify build**

Run: `pnpm build`
Expected: Compiles successfully

**Step 5: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/ generated/
git commit -m "feat: add EtlPipeline and EtlMapping Prisma models"
```

---

## Task 2: API — Pipeline CRUD Routes

**Files:**
- Create: `app/api/pipelines/route.ts`
- Create: `app/api/pipelines/[id]/route.ts`

**Step 1: Create pipeline list + create endpoint**

Create `app/api/pipelines/route.ts`:

```typescript
import { NextResponse } from "next/server";
import prisma from "@/lib/db";

export async function GET(): Promise<NextResponse> {
  const pipelines = await prisma.etlPipeline.findMany({
    orderBy: { updatedAt: "desc" },
    include: {
      _count: { select: { mappings: true } },
      sourceDataSource: { select: { id: true, name: true, type: true } },
      destDataSource: { select: { id: true, name: true, type: true } },
    },
  });

  return NextResponse.json({ pipelines });
}

export async function POST(req: Request): Promise<NextResponse> {
  const body = (await req.json()) as {
    name?: string;
    description?: string;
    sourceDataSourceId?: string;
    destDataSourceId?: string;
  };

  if (!body.name?.trim()) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }
  if (!body.sourceDataSourceId || !body.destDataSourceId) {
    return NextResponse.json(
      { error: "Source and destination data sources are required" },
      { status: 400 }
    );
  }

  const pipeline = await prisma.etlPipeline.create({
    data: {
      name: body.name.trim(),
      description: body.description?.trim() || null,
      sourceDataSourceId: body.sourceDataSourceId,
      destDataSourceId: body.destDataSourceId,
    },
  });

  return NextResponse.json({ pipeline }, { status: 201 });
}
```

**Step 2: Create pipeline detail + update + delete endpoint**

Create `app/api/pipelines/[id]/route.ts`:

```typescript
import { NextResponse } from "next/server";
import prisma from "@/lib/db";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { id } = await params;

  const pipeline = await prisma.etlPipeline.findUnique({
    where: { id },
    include: {
      mappings: { orderBy: { orderIndex: "asc" } },
      sourceDataSource: {
        select: { id: true, name: true, type: true, connectionUri: true },
        include: {
          databaseDoc: {
            include: {
              tables: {
                include: { columns: { orderBy: { columnName: "asc" } } },
              },
            },
          },
        },
      },
      destDataSource: {
        select: { id: true, name: true, type: true, connectionUri: true },
        include: {
          databaseDoc: {
            include: {
              tables: {
                include: { columns: { orderBy: { columnName: "asc" } } },
              },
            },
          },
        },
      },
    },
  });

  if (!pipeline) {
    return NextResponse.json({ error: "Pipeline not found" }, { status: 404 });
  }

  return NextResponse.json({ pipeline });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { id } = await params;
  const body = (await req.json()) as {
    name?: string;
    description?: string;
    status?: string;
  };

  const data: Record<string, unknown> = {};
  if (body.name !== undefined) data.name = body.name.trim();
  if (body.description !== undefined) data.description = body.description;
  if (body.status !== undefined) data.status = body.status;

  try {
    const pipeline = await prisma.etlPipeline.update({
      where: { id },
      data,
    });
    return NextResponse.json({ pipeline });
  } catch {
    return NextResponse.json({ error: "Pipeline not found" }, { status: 404 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { id } = await params;

  try {
    await prisma.etlPipeline.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Pipeline not found" }, { status: 404 });
  }
}
```

**Step 3: Verify build**

Run: `pnpm build`
Expected: Routes appear in build output

**Step 4: Commit**

```bash
git add app/api/pipelines/
git commit -m "feat: add pipeline CRUD API routes"
```

---

## Task 3: API — Mapping CRUD Routes

**Files:**
- Create: `app/api/pipelines/[id]/mappings/route.ts`
- Create: `app/api/pipelines/[id]/mappings/[mappingId]/route.ts`

**Step 1: Create mapping list + create endpoint**

Create `app/api/pipelines/[id]/mappings/route.ts`:

```typescript
import { NextResponse } from "next/server";
import prisma from "@/lib/db";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { id } = await params;

  const mappings = await prisma.etlMapping.findMany({
    where: { pipelineId: id },
    orderBy: { orderIndex: "asc" },
  });

  return NextResponse.json({ mappings });
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { id } = await params;
  const body = (await req.json()) as {
    name?: string;
    sourceQuery?: string;
    destTable?: string;
    columnMappings?: Record<string, string>;
    conflictStrategy?: string;
  };

  if (!body.name?.trim() || !body.destTable?.trim()) {
    return NextResponse.json(
      { error: "Name and destTable are required" },
      { status: 400 }
    );
  }

  // Get max orderIndex for this pipeline
  const last = await prisma.etlMapping.findFirst({
    where: { pipelineId: id },
    orderBy: { orderIndex: "desc" },
    select: { orderIndex: true },
  });

  const mapping = await prisma.etlMapping.create({
    data: {
      pipelineId: id,
      name: body.name.trim(),
      sourceQuery: body.sourceQuery ?? "",
      destTable: body.destTable.trim(),
      columnMappings: body.columnMappings ?? {},
      conflictStrategy: body.conflictStrategy ?? "insert",
      orderIndex: (last?.orderIndex ?? -1) + 1,
    },
  });

  return NextResponse.json({ mapping }, { status: 201 });
}
```

**Step 2: Create mapping detail + update + delete endpoint**

Create `app/api/pipelines/[id]/mappings/[mappingId]/route.ts`:

```typescript
import { NextResponse } from "next/server";
import prisma from "@/lib/db";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string; mappingId: string }> }
): Promise<NextResponse> {
  const { mappingId } = await params;
  const body = (await req.json()) as {
    name?: string;
    sourceQuery?: string;
    destTable?: string;
    columnMappings?: Record<string, string>;
    conflictStrategy?: string;
    orderIndex?: number;
  };

  const data: Record<string, unknown> = {};
  if (body.name !== undefined) data.name = body.name;
  if (body.sourceQuery !== undefined) data.sourceQuery = body.sourceQuery;
  if (body.destTable !== undefined) data.destTable = body.destTable;
  if (body.columnMappings !== undefined) data.columnMappings = body.columnMappings;
  if (body.conflictStrategy !== undefined) data.conflictStrategy = body.conflictStrategy;
  if (body.orderIndex !== undefined) data.orderIndex = body.orderIndex;

  try {
    const mapping = await prisma.etlMapping.update({
      where: { id: mappingId },
      data,
    });
    return NextResponse.json({ mapping });
  } catch {
    return NextResponse.json({ error: "Mapping not found" }, { status: 404 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; mappingId: string }> }
): Promise<NextResponse> {
  const { mappingId } = await params;

  try {
    await prisma.etlMapping.delete({ where: { id: mappingId } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Mapping not found" }, { status: 404 });
  }
}
```

**Step 3: Verify build**

Run: `pnpm build`

**Step 4: Commit**

```bash
git add app/api/pipelines/
git commit -m "feat: add mapping CRUD API routes"
```

---

## Task 4: SQL Generation Library

**Files:**
- Create: `lib/etl/generate.ts`

**Step 1: Implement SQL generation**

Create `lib/etl/generate.ts`:

```typescript
interface MappingForExport {
  name: string;
  sourceQuery: string;
  destTable: string;
  columnMappings: Record<string, string>;
  conflictStrategy: string;
  orderIndex: number;
}

interface ExportOptions {
  pipelineName: string;
  sourceConnectionUri?: string;
  destConnectionUri?: string;
}

export function generateExportSql(
  mappings: MappingForExport[],
  options: ExportOptions
): string {
  const sorted = [...mappings].sort((a, b) => a.orderIndex - b.orderIndex);
  const header = [
    `-- Pipeline: ${options.pipelineName}`,
    `-- Generated by DataWeaver on ${new Date().toISOString().split("T")[0]}`,
    options.sourceConnectionUri
      ? `-- Source: ${maskConnectionUri(options.sourceConnectionUri)}`
      : null,
    options.destConnectionUri
      ? `-- Destination: ${maskConnectionUri(options.destConnectionUri)}`
      : null,
    "",
  ]
    .filter((line) => line !== null)
    .join("\n");

  const statements = sorted.map((mapping, i) => {
    return generateMappingSql(mapping, i + 1);
  });

  return header + "\n" + statements.join("\n\n");
}

function generateMappingSql(mapping: MappingForExport, index: number): string {
  const destCols = Object.values(mapping.columnMappings);
  const sourceCols = Object.keys(mapping.columnMappings);

  const header = [
    `-- Mapping ${index}: ${mapping.name}`,
    `-- Strategy: ${mapping.conflictStrategy.toUpperCase()}`,
  ].join("\n");

  if (!mapping.sourceQuery.trim() || destCols.length === 0) {
    return `${header}\n-- WARNING: Incomplete mapping — no source query or column mappings defined`;
  }

  const destColList = destCols.join(", ");

  // Wrap sourceQuery in a subquery to alias columns correctly
  const selectAliases = sourceCols
    .map((src, i) => `${src} AS "${destCols[i]}"`)
    .join(", ");

  let sql: string;

  if (mapping.conflictStrategy === "upsert") {
    // For upsert we need the user to have defined the conflict target
    // We use the first column as default conflict target
    const conflictCol = destCols[0];
    const updateSets = destCols
      .slice(1)
      .map((col) => `  ${col} = EXCLUDED.${col}`)
      .join(",\n");

    sql = `INSERT INTO ${mapping.destTable} (${destColList})\n${mapping.sourceQuery}\nON CONFLICT (${conflictCol}) DO UPDATE SET\n${updateSets};`;
  } else if (mapping.conflictStrategy === "replace") {
    sql = `DELETE FROM ${mapping.destTable};\n\nINSERT INTO ${mapping.destTable} (${destColList})\n${mapping.sourceQuery};`;
  } else {
    // insert
    sql = `INSERT INTO ${mapping.destTable} (${destColList})\n${mapping.sourceQuery};`;
  }

  return `${header}\n${sql}`;
}

function maskConnectionUri(uri: string): string {
  try {
    const url = new URL(uri);
    if (url.password) {
      url.password = "****";
    }
    return url.toString();
  } catch {
    return uri;
  }
}

export function generatePreviewSql(mapping: MappingForExport): string {
  if (!mapping.sourceQuery.trim()) {
    return "-- No source query defined";
  }
  // Wrap in LIMIT for preview safety
  return `${mapping.sourceQuery.replace(/;\s*$/, "")}\nLIMIT 100;`;
}
```

**Step 2: Verify build**

Run: `pnpm build`

**Step 3: Commit**

```bash
git add lib/etl/
git commit -m "feat: add SQL generation library for ETL export"
```

---

## Task 5: SQL Export API Route

**Files:**
- Create: `app/api/pipelines/[id]/generate/route.ts`

**Step 1: Implement export endpoint**

Create `app/api/pipelines/[id]/generate/route.ts`:

```typescript
import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { generateExportSql } from "@/lib/etl/generate";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { id } = await params;

  const pipeline = await prisma.etlPipeline.findUnique({
    where: { id },
    include: {
      mappings: { orderBy: { orderIndex: "asc" } },
      sourceDataSource: { select: { connectionUri: true } },
      destDataSource: { select: { connectionUri: true } },
    },
  });

  if (!pipeline) {
    return NextResponse.json({ error: "Pipeline not found" }, { status: 404 });
  }

  const sql = generateExportSql(
    pipeline.mappings.map((m) => ({
      name: m.name,
      sourceQuery: m.sourceQuery,
      destTable: m.destTable,
      columnMappings: m.columnMappings as Record<string, string>,
      conflictStrategy: m.conflictStrategy,
      orderIndex: m.orderIndex,
    })),
    {
      pipelineName: pipeline.name,
      sourceConnectionUri: pipeline.sourceDataSource.connectionUri ?? undefined,
      destConnectionUri: pipeline.destDataSource.connectionUri ?? undefined,
    }
  );

  return NextResponse.json({ sql });
}
```

**Step 2: Verify build**

Run: `pnpm build`

**Step 3: Commit**

```bash
git add app/api/pipelines/[id]/generate/
git commit -m "feat: add SQL export API endpoint for pipelines"
```

---

## Task 6: ETL Agent — System Prompt and Tools

**Files:**
- Create: `lib/etl/agent.ts`

**Step 1: Implement ETL agent with tools**

This agent is specialized for building ETL mappings. It receives both source and destination schemas, and has tools to create/update/delete mappings.

Create `lib/etl/agent.ts`:

```typescript
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
import { getToolboxClient } from "@/lib/toolbox/client";
import { validateQuery } from "@/lib/agent/validation";
import { formatQueryResult } from "@/lib/agent/formatter";

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

function formatSchema(label: string, tables: SchemaTable[]): string {
  return tables
    .map((table) => {
      const header = table.displayName
        ? `${label} Table: ${table.tableName} (${table.displayName})`
        : `${label} Table: ${table.tableName}`;
      const desc = table.description ? `${table.description}\n` : "";
      const cols = table.columns
        .map((col) => {
          let line = `  - ${col.columnName} (${col.dataType})`;
          if (col.isPrimaryKey) line += " [PK]";
          if (col.isForeignKey) line += " [FK]";
          if (col.description) line += ` — ${col.description}`;
          return line;
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
  const sourceSchema = formatSchema("SOURCE", sourceTables);
  const destSchema = formatSchema("DEST", destTables);

  return `You are an ETL mapping assistant. You help users define data mappings between a source database and a destination database.

## Source Database Schema

${sourceSchema}

## Destination Database Schema

${destSchema}

## Your Role

Users describe data transformations in natural language. You create and update ETL mappings using the available tools.

## Rules

1. Use the createMapping tool to define new source→destination table mappings.
2. The sourceQuery should be a valid PostgreSQL SELECT statement that extracts and transforms data from the SOURCE database.
3. The columnMappings object maps SELECT output column names/aliases to destination table column names.
4. Use the previewQuery tool to validate a SELECT query before creating a mapping.
5. Choose the appropriate conflictStrategy: "insert" (append), "upsert" (update existing by key), "replace" (delete all + insert).
6. For aggregations, JOINs, and complex transforms, put all the logic in the sourceQuery SELECT statement.
7. When the user asks you to "suggest mappings" or "auto-map", analyze both schemas and create mappings for tables that have matching or similar structures.
8. Explain what each mapping does in plain language.
9. If a request is ambiguous, ask for clarification before creating mappings.`;
}

function createEtlTools(pipelineId: string) {
  return {
    createMapping: tool({
      description:
        "Create a new ETL mapping from source table(s) to a destination table. The sourceQuery is a SELECT statement that extracts data from the source database.",
      inputSchema: z.object({
        name: z.string().describe("Human-readable name for this mapping (e.g. 'Orders → Sales Summary')"),
        sourceQuery: z.string().describe("PostgreSQL SELECT query to extract and transform data from the source database"),
        destTable: z.string().describe("Name of the destination table to load data into"),
        columnMappings: z
          .record(z.string(), z.string())
          .describe("Maps SELECT column aliases to destination column names, e.g. { 'customer_id': 'cust_id', 'total': 'revenue' }"),
        conflictStrategy: z
          .enum(["insert", "upsert", "replace"])
          .default("insert")
          .describe("How to handle existing rows: insert (append), upsert (update by key), replace (delete all + insert)"),
      }),
      execute: async ({ name, sourceQuery, destTable, columnMappings, conflictStrategy }) => {
        const last = await prisma.etlMapping.findFirst({
          where: { pipelineId },
          orderBy: { orderIndex: "desc" },
          select: { orderIndex: true },
        });

        const mapping = await prisma.etlMapping.create({
          data: {
            pipelineId,
            name,
            sourceQuery,
            destTable,
            columnMappings,
            conflictStrategy,
            orderIndex: (last?.orderIndex ?? -1) + 1,
          },
        });

        return {
          success: true,
          mappingId: mapping.id,
          message: `Created mapping "${name}": ${destTable} ← source query`,
        };
      },
    }),

    updateMapping: tool({
      description: "Update an existing ETL mapping by its ID.",
      inputSchema: z.object({
        mappingId: z.string().describe("The ID of the mapping to update"),
        name: z.string().optional().describe("New name for the mapping"),
        sourceQuery: z.string().optional().describe("Updated SELECT query"),
        destTable: z.string().optional().describe("Updated destination table"),
        columnMappings: z.record(z.string(), z.string()).optional().describe("Updated column mappings"),
        conflictStrategy: z.enum(["insert", "upsert", "replace"]).optional(),
      }),
      execute: async ({ mappingId, ...updates }) => {
        const data: Record<string, unknown> = {};
        if (updates.name !== undefined) data.name = updates.name;
        if (updates.sourceQuery !== undefined) data.sourceQuery = updates.sourceQuery;
        if (updates.destTable !== undefined) data.destTable = updates.destTable;
        if (updates.columnMappings !== undefined) data.columnMappings = updates.columnMappings;
        if (updates.conflictStrategy !== undefined) data.conflictStrategy = updates.conflictStrategy;

        try {
          await prisma.etlMapping.update({ where: { id: mappingId }, data });
          return { success: true, message: `Updated mapping ${mappingId}` };
        } catch {
          return { success: false, message: "Mapping not found" };
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
          return { success: true, message: `Deleted mapping ${mappingId}` };
        } catch {
          return { success: false, message: "Mapping not found" };
        }
      },
    }),

    previewQuery: tool({
      description:
        "Execute a read-only SELECT query against the source database to validate and preview the extraction results. Limited to 100 rows.",
      inputSchema: z.object({
        sql: z.string().describe("The SELECT query to preview"),
      }),
      execute: async ({ sql }) => {
        const validation = validateQuery(sql);
        if (!validation.valid) {
          return { error: true, message: validation.reason };
        }

        const safeSql = `${sql.replace(/;\s*$/, "")} LIMIT 100`;
        const client = getToolboxClient();

        try {
          const result = await client.executeTool("execute-sql", { sql: safeSql });
          const formatted = formatQueryResult(result);
          return { error: false, ...formatted };
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          return { error: true, message: `Query failed: ${message}` };
        }
      },
    }),
  };
}

export async function createEtlAgentStream(
  pipelineId: string,
  messages: UIMessage[],
  sourceTables: SchemaTable[],
  destTables: SchemaTable[]
) {
  const systemPrompt = buildEtlSystemPrompt(sourceTables, destTables);
  const tools = createEtlTools(pipelineId);

  return streamText({
    model: google("gemini-2.5-flash"),
    system: systemPrompt,
    messages: await convertToModelMessages(messages),
    tools,
    stopWhen: stepCountIs(10),
  });
}
```

**Step 2: Verify build**

Run: `pnpm build`

**Step 3: Commit**

```bash
git add lib/etl/agent.ts
git commit -m "feat: add ETL agent with mapping tools and system prompt"
```

---

## Task 7: ETL Chat API Route

**Files:**
- Create: `app/api/pipelines/[id]/chat/route.ts`

**Step 1: Implement chat endpoint**

Create `app/api/pipelines/[id]/chat/route.ts`:

```typescript
import type { UIMessage } from "ai";
import prisma from "@/lib/db";
import { createEtlAgentStream } from "@/lib/etl/agent";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  const { id } = await params;
  const body = (await req.json()) as { messages: UIMessage[] };
  const { messages } = body;

  const pipeline = await prisma.etlPipeline.findUnique({
    where: { id },
    include: {
      sourceDataSource: {
        include: {
          databaseDoc: {
            include: {
              tables: {
                include: { columns: { orderBy: { columnName: "asc" } } },
              },
            },
          },
        },
      },
      destDataSource: {
        include: {
          databaseDoc: {
            include: {
              tables: {
                include: { columns: { orderBy: { columnName: "asc" } } },
              },
            },
          },
        },
      },
    },
  });

  if (!pipeline) {
    return new Response("Pipeline not found", { status: 404 });
  }

  const sourceTables = (pipeline.sourceDataSource.databaseDoc?.tables ?? []).map(
    (t) => ({
      tableName: t.tableName,
      displayName: t.displayName,
      description: t.description,
      columns: t.columns.map((c) => ({
        columnName: c.columnName,
        displayName: c.displayName,
        description: c.description,
        dataType: c.dataType,
        isPrimaryKey: c.isPrimaryKey,
        isForeignKey: c.isForeignKey,
      })),
    })
  );

  const destTables = (pipeline.destDataSource.databaseDoc?.tables ?? []).map(
    (t) => ({
      tableName: t.tableName,
      displayName: t.displayName,
      description: t.description,
      columns: t.columns.map((c) => ({
        columnName: c.columnName,
        displayName: c.displayName,
        description: c.description,
        dataType: c.dataType,
        isPrimaryKey: c.isPrimaryKey,
        isForeignKey: c.isForeignKey,
      })),
    })
  );

  // Ensure conversation exists for message persistence
  if (!pipeline.conversationId) {
    const conversation = await prisma.conversation.create({ data: {} });
    await prisma.etlPipeline.update({
      where: { id },
      data: { conversationId: conversation.id },
    });
  }

  const result = await createEtlAgentStream(
    id,
    messages,
    sourceTables,
    destTables
  );

  return result.toUIMessageStreamResponse();
}
```

**Step 2: Verify build**

Run: `pnpm build`

**Step 3: Commit**

```bash
git add app/api/pipelines/[id]/chat/
git commit -m "feat: add ETL pipeline chat API endpoint"
```

---

## Task 8: Navigation — Add Pipelines to Sidebar

**Files:**
- Modify: `app/(app)/layout.tsx`

**Step 1: Add Pipelines nav item**

In `app/(app)/layout.tsx`, add `Workflow` to the lucide imports and add a new entry to `navItems`:

Add to imports:
```typescript
import { ..., Workflow } from "lucide-react";
```

Add to `navItems` array (after the "Connections" entry):
```typescript
{ title: "Pipelines", href: "/pipelines", icon: Workflow },
```

**Step 2: Verify build**

Run: `pnpm build`

**Step 3: Commit**

```bash
git add app/\(app\)/layout.tsx
git commit -m "feat: add Pipelines to sidebar navigation"
```

---

## Task 9: Pipeline List Page

**Files:**
- Create: `app/(app)/pipelines/page.tsx`
- Create: `components/pipeline/create-pipeline-dialog.tsx`

**Step 1: Create the pipeline list page**

Create `app/(app)/pipelines/page.tsx`:

```typescript
"use client";

import * as React from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Workflow, Trash2, Database, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CreatePipelineDialog } from "@/components/pipeline/create-pipeline-dialog";

interface PipelineSummary {
  id: string;
  name: string;
  description: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
  _count: { mappings: number };
  sourceDataSource: { id: string; name: string; type: string };
  destDataSource: { id: string; name: string; type: string };
}

export default function PipelinesPage(): React.ReactElement {
  const queryClient = useQueryClient();

  const { data: pipelines = [], isLoading } = useQuery({
    queryKey: ["pipelines"],
    queryFn: async () => {
      const res = await fetch("/api/pipelines");
      const json = (await res.json()) as { pipelines: PipelineSummary[] };
      return json.pipelines;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await fetch(`/api/pipelines/${id}`, { method: "DELETE" });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["pipelines"] });
    },
  });

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black uppercase tracking-tight">
            ETL Pipelines
          </h1>
          <p className="text-sm text-muted-foreground">
            Map data between sources and export SQL scripts.
          </p>
        </div>
        <CreatePipelineDialog>
          <Button className="gap-2">
            <Plus className="size-4" />
            New Pipeline
          </Button>
        </CreatePipelineDialog>
      </div>

      {isLoading ? (
        <div className="text-sm text-muted-foreground">Loading...</div>
      ) : pipelines.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Workflow className="mb-4 size-12 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              No pipelines yet. Create one to get started.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {pipelines.map((pipeline) => (
            <Card key={pipeline.id} className="group relative">
              <Link href={`/pipelines/${pipeline.id}`}>
                <CardHeader>
                  <CardTitle className="text-base">{pipeline.name}</CardTitle>
                  <CardDescription>
                    {pipeline._count.mappings} mapping
                    {pipeline._count.mappings !== 1 ? "s" : ""} &middot;
                    Updated{" "}
                    {new Date(pipeline.updatedAt).toLocaleDateString()}
                  </CardDescription>
                  <div className="flex items-center gap-1.5 mt-2">
                    <Badge
                      variant="secondary"
                      className="gap-1 text-[10px]"
                    >
                      <Database className="size-3" />
                      {pipeline.sourceDataSource.name}
                    </Badge>
                    <ArrowRight className="size-3 text-muted-foreground" />
                    <Badge
                      variant="secondary"
                      className="gap-1 text-[10px]"
                    >
                      <Database className="size-3" />
                      {pipeline.destDataSource.name}
                    </Badge>
                  </div>
                  <Badge
                    variant={pipeline.status === "ready" ? "default" : "outline"}
                    className="mt-2 w-fit text-[10px]"
                  >
                    {pipeline.status}
                  </Badge>
                </CardHeader>
              </Link>
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity size-7"
                onClick={() => deleteMutation.mutate(pipeline.id)}
              >
                <Trash2 className="size-3" />
              </Button>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
```

**Step 2: Create the CreatePipelineDialog component**

Create `components/pipeline/create-pipeline-dialog.tsx`:

```typescript
"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Database, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface DataSourceOption {
  id: string;
  name: string;
  type: string;
  status: string;
}

export function CreatePipelineDialog({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  const [step, setStep] = React.useState<1 | 2 | 3>(1);
  const [name, setName] = React.useState("");
  const [sourceId, setSourceId] = React.useState<string | null>(null);
  const [destId, setDestId] = React.useState<string | null>(null);
  const [isCreating, setIsCreating] = React.useState(false);

  const { data: dataSources = [], isLoading: isLoadingSources } = useQuery({
    queryKey: ["connections"],
    queryFn: async () => {
      const res = await fetch("/api/connections");
      const json = (await res.json()) as { connections: DataSourceOption[] };
      return json.connections;
    },
    enabled: step >= 2,
  });

  function reset(): void {
    setStep(1);
    setName("");
    setSourceId(null);
    setDestId(null);
  }

  async function handleCreate(): Promise<void> {
    if (!name.trim() || !sourceId || !destId) return;
    setIsCreating(true);
    try {
      const res = await fetch("/api/pipelines", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          sourceDataSourceId: sourceId,
          destDataSourceId: destId,
        }),
      });
      if (res.ok) {
        const json = (await res.json()) as { pipeline: { id: string } };
        setOpen(false);
        reset();
        router.push(`/pipelines/${json.pipeline.id}`);
      }
    } finally {
      setIsCreating(false);
    }
  }

  function DataSourceList({
    selectedId,
    onSelect,
    excludeId,
  }: {
    selectedId: string | null;
    onSelect: (id: string) => void;
    excludeId?: string | null;
  }) {
    if (isLoadingSources) {
      return (
        <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
          <Loader2 className="mr-2 size-4 animate-spin" />
          Loading data sources...
        </div>
      );
    }

    const filtered = dataSources.filter((ds) => ds.id !== excludeId);

    if (filtered.length === 0) {
      return (
        <p className="text-sm text-muted-foreground text-center py-4">
          {excludeId
            ? "No other data sources available."
            : "No data sources yet. Add a connection first."}
        </p>
      );
    }

    return (
      <div className="space-y-2 max-h-60 overflow-y-auto">
        {filtered.map((ds) => (
          <Card
            key={ds.id}
            className={`flex cursor-pointer items-center gap-3 p-3 transition-colors hover:bg-muted/50 ${
              selectedId === ds.id ? "border-primary bg-primary/5" : ""
            }`}
            onClick={() => onSelect(ds.id)}
          >
            <Database className="size-4 shrink-0 text-muted-foreground" />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate">{ds.name}</div>
              <div className="text-xs text-muted-foreground">{ds.type}</div>
            </div>
            {selectedId === ds.id && (
              <Check className="size-4 text-primary shrink-0" />
            )}
            <Badge variant="secondary" className="text-[10px] shrink-0">
              {ds.status}
            </Badge>
          </Card>
        ))}
      </div>
    );
  }

  if (!mounted) return <>{children}</>;

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) reset();
      }}
    >
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {step === 1
              ? "Create Pipeline"
              : step === 2
                ? "Select Source Database"
                : "Select Destination Database"}
          </DialogTitle>
        </DialogHeader>

        {step === 1 ? (
          <div className="space-y-4 pt-2">
            <Input
              placeholder="Pipeline name..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && name.trim()) setStep(2);
              }}
              autoFocus
            />
            <Button
              onClick={() => setStep(2)}
              className="w-full"
              disabled={!name.trim()}
            >
              Next
            </Button>
          </div>
        ) : step === 2 ? (
          <div className="space-y-4 pt-2">
            <DataSourceList
              selectedId={sourceId}
              onSelect={setSourceId}
            />
            <Button
              onClick={() => setStep(3)}
              className="w-full"
              disabled={!sourceId}
            >
              Next — Select Destination
            </Button>
          </div>
        ) : (
          <div className="space-y-4 pt-2">
            <DataSourceList
              selectedId={destId}
              onSelect={setDestId}
              excludeId={sourceId}
            />
            <Button
              onClick={() => void handleCreate()}
              className="w-full"
              disabled={isCreating || !destId}
            >
              {isCreating ? "Creating..." : "Create Pipeline"}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
```

**Step 3: Verify build**

Run: `pnpm build`

**Step 4: Commit**

```bash
git add app/\(app\)/pipelines/ components/pipeline/
git commit -m "feat: add pipeline list page with create dialog"
```

---

## Task 10: Pipeline Editor Page — Layout Shell

**Files:**
- Create: `app/(app)/pipelines/[id]/page.tsx`

**Step 1: Create the editor page shell**

This is the three-panel layout: canvas (left), detail panel (center), chat sidebar (right). We'll build each panel in subsequent tasks, so this task just sets up the layout with placeholder panels and data fetching.

Create `app/(app)/pipelines/[id]/page.tsx`:

```typescript
"use client";

import * as React from "react";
import { use } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { UIMessage } from "ai";
import {
  ArrowLeft,
  Database,
  ArrowRight,
  GripVertical,
  Download,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PipelineCanvas } from "@/components/pipeline/pipeline-canvas";
import { MappingDetailPanel } from "@/components/pipeline/mapping-detail-panel";
import { PipelineChatPanel } from "@/components/pipeline/pipeline-chat-panel";
import { ExportModal } from "@/components/pipeline/export-modal";

interface PipelineDetail {
  id: string;
  name: string;
  description: string | null;
  status: string;
  sourceDataSource: DataSourceWithSchema;
  destDataSource: DataSourceWithSchema;
  mappings: MappingData[];
}

interface DataSourceWithSchema {
  id: string;
  name: string;
  type: string;
  connectionUri: string | null;
  databaseDoc: {
    tables: {
      id: string;
      tableName: string;
      displayName: string;
      description: string | null;
      columns: {
        id: string;
        columnName: string;
        displayName: string;
        description: string | null;
        dataType: string;
        isPrimaryKey: boolean;
        isForeignKey: boolean;
      }[];
    }[];
  } | null;
}

export interface MappingData {
  id: string;
  name: string;
  sourceQuery: string;
  destTable: string;
  columnMappings: Record<string, string>;
  conflictStrategy: string;
  orderIndex: number;
}

export default function PipelineEditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}): React.ReactElement {
  const { id } = use(params);
  const queryClient = useQueryClient();
  const [selectedMappingId, setSelectedMappingId] = React.useState<
    string | null
  >(null);
  const [exportOpen, setExportOpen] = React.useState(false);
  const [chatWidth, setChatWidth] = React.useState(340);
  const isResizing = React.useRef(false);

  const {
    data: pipeline,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["pipeline", id],
    queryFn: async () => {
      const res = await fetch(`/api/pipelines/${id}`);
      if (!res.ok) throw new Error("Pipeline not found");
      const json = (await res.json()) as { pipeline: PipelineDetail };
      return json.pipeline;
    },
  });

  const invalidate = React.useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ["pipeline", id] });
  }, [queryClient, id]);

  const selectedMapping = pipeline?.mappings.find(
    (m) => m.id === selectedMappingId
  ) ?? null;

  const handleMouseDown = React.useCallback(() => {
    isResizing.current = true;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";

    function onMouseMove(e: MouseEvent): void {
      if (!isResizing.current) return;
      const newWidth = Math.min(
        500,
        Math.max(280, window.innerWidth - e.clientX)
      );
      setChatWidth(newWidth);
    }

    function onMouseUp(): void {
      isResizing.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    }

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  }, []);

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        Loading pipeline...
      </div>
    );
  }

  if (error || !pipeline) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4">
        <p className="text-sm text-destructive">
          {error instanceof Error ? error.message : "Not found"}
        </p>
        <Button asChild variant="outline">
          <Link href="/pipelines">Back to Pipelines</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 border-b-2 border-black px-4 py-3">
        <Button asChild variant="ghost" size="icon" className="size-8">
          <Link href="/pipelines">
            <ArrowLeft className="size-4" />
          </Link>
        </Button>
        <h1 className="text-sm font-black uppercase tracking-tight">
          {pipeline.name}
        </h1>
        <div className="flex items-center gap-1.5">
          <Badge variant="secondary" className="gap-1 text-[10px]">
            <Database className="size-3" />
            {pipeline.sourceDataSource.name}
          </Badge>
          <ArrowRight className="size-3 text-muted-foreground" />
          <Badge variant="secondary" className="gap-1 text-[10px]">
            <Database className="size-3" />
            {pipeline.destDataSource.name}
          </Badge>
        </div>
        <Badge
          variant={pipeline.status === "ready" ? "default" : "outline"}
          className="text-[10px]"
        >
          {pipeline.status}
        </Badge>
        <div className="flex-1" />
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={() => setExportOpen(true)}
          disabled={pipeline.mappings.length === 0}
        >
          <Download className="size-3.5" />
          Export SQL
        </Button>
      </div>

      {/* Three-panel layout */}
      <div className="flex flex-1 min-h-0">
        {/* Canvas + Detail Panel */}
        <div className="flex flex-1 min-w-0">
          <div className="flex-1 min-w-0">
            <PipelineCanvas
              pipeline={pipeline}
              selectedMappingId={selectedMappingId}
              onSelectMapping={setSelectedMappingId}
              onMappingsChanged={invalidate}
            />
          </div>
          {selectedMapping && (
            <div className="w-80 border-l-2 border-black overflow-y-auto">
              <MappingDetailPanel
                pipelineId={id}
                mapping={selectedMapping}
                onUpdated={invalidate}
                onClose={() => setSelectedMappingId(null)}
              />
            </div>
          )}
        </div>

        {/* Resize handle */}
        <div
          className="w-1 cursor-col-resize bg-transparent hover:bg-muted-foreground/20 transition-colors flex items-center justify-center"
          onMouseDown={handleMouseDown}
        >
          <GripVertical className="size-3 text-muted-foreground/40" />
        </div>

        {/* Chat sidebar */}
        <div
          className="flex flex-col border-l-2 border-black h-full"
          style={{ width: chatWidth, minWidth: 280, maxWidth: 500 }}
        >
          <PipelineChatPanel
            pipelineId={id}
            onMappingsChanged={invalidate}
          />
        </div>
      </div>

      {/* Export modal */}
      <ExportModal
        pipelineId={id}
        pipelineName={pipeline.name}
        open={exportOpen}
        onOpenChange={setExportOpen}
      />
    </div>
  );
}
```

**Step 2: Create stub components so the build passes**

Create `components/pipeline/pipeline-canvas.tsx`:

```typescript
"use client";

import type { MappingData } from "@/app/(app)/pipelines/[id]/page";

interface PipelineCanvasProps {
  pipeline: {
    id: string;
    sourceDataSource: { databaseDoc: { tables: { id: string; tableName: string; displayName: string; columns: { columnName: string }[] }[] } | null };
    destDataSource: { databaseDoc: { tables: { id: string; tableName: string; displayName: string; columns: { columnName: string }[] }[] } | null };
    mappings: MappingData[];
  };
  selectedMappingId: string | null;
  onSelectMapping: (id: string | null) => void;
  onMappingsChanged: () => void;
}

export function PipelineCanvas({ pipeline }: PipelineCanvasProps) {
  return (
    <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
      Canvas — {pipeline.mappings.length} mappings
    </div>
  );
}
```

Create `components/pipeline/mapping-detail-panel.tsx`:

```typescript
"use client";

import type { MappingData } from "@/app/(app)/pipelines/[id]/page";

interface MappingDetailPanelProps {
  pipelineId: string;
  mapping: MappingData;
  onUpdated: () => void;
  onClose: () => void;
}

export function MappingDetailPanel({ mapping, onClose }: MappingDetailPanelProps) {
  return (
    <div className="p-4">
      <button onClick={onClose} className="text-xs text-muted-foreground">
        Close
      </button>
      <h3 className="text-sm font-medium mt-2">{mapping.name}</h3>
    </div>
  );
}
```

Create `components/pipeline/pipeline-chat-panel.tsx`:

```typescript
"use client";

interface PipelineChatPanelProps {
  pipelineId: string;
  onMappingsChanged: () => void;
}

export function PipelineChatPanel({ pipelineId }: PipelineChatPanelProps) {
  return (
    <div className="flex h-full items-center justify-center text-sm text-muted-foreground p-4">
      Chat for pipeline {pipelineId}
    </div>
  );
}
```

Create `components/pipeline/export-modal.tsx`:

```typescript
"use client";

interface ExportModalProps {
  pipelineId: string;
  pipelineName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ExportModal({ open }: ExportModalProps) {
  if (!open) return null;
  return null;
}
```

**Step 3: Verify build**

Run: `pnpm build`

**Step 4: Commit**

```bash
git add app/\(app\)/pipelines/\[id\]/ components/pipeline/
git commit -m "feat: add pipeline editor page layout with stub components"
```

---

## Task 11: Pipeline Canvas — XY Flow Implementation

**Files:**
- Modify: `components/pipeline/pipeline-canvas.tsx`

**Step 1: Implement the full XY Flow canvas**

Replace the stub in `components/pipeline/pipeline-canvas.tsx` with the full implementation. Source tables appear as nodes on the left, destination tables on the right. Edges connect them where mappings exist. Clicking an edge selects that mapping.

The full component should:
- Use `ReactFlowProvider` and `useNodesState` / `useEdgesState`
- Build source table nodes (left column, position x=0) and dest table nodes (right column, position x=500)
- Each node shows table name and column list
- Edges connect based on `mappings` — from the source table node to the dest table node
- Highlight the selected mapping's edge
- `onNodeClick` / `onEdgeClick` calls `onSelectMapping`

This is a large component — see the ERD canvas at `components/catalog/erd-canvas.tsx` for the exact XY Flow patterns used in this codebase (ReactFlowProvider wrapper, `useNodesState`, custom node types, `fitView`, `Background`, `Controls`).

**Step 2: Verify build**

Run: `pnpm build`

**Step 3: Commit**

```bash
git add components/pipeline/pipeline-canvas.tsx
git commit -m "feat: implement XY Flow canvas for pipeline editor"
```

---

## Task 12: Mapping Detail Panel — Full Implementation

**Files:**
- Modify: `components/pipeline/mapping-detail-panel.tsx`

**Step 1: Implement the detail panel**

Replace the stub with a full panel that shows:
- Mapping name (editable)
- Source query in a `<textarea>` with monospace font
- Column mappings as a table (source alias → dest column) with add/remove rows
- Conflict strategy dropdown (`<select>` or Shadcn Select)
- Save button that PATCHes `/api/pipelines/[id]/mappings/[mappingId]`
- Delete button that DELETEs the mapping

On save, call `onUpdated()` to refresh the pipeline data.

**Step 2: Verify build**

Run: `pnpm build`

**Step 3: Commit**

```bash
git add components/pipeline/mapping-detail-panel.tsx
git commit -m "feat: implement mapping detail panel with SQL editor and column mappings"
```

---

## Task 13: Pipeline Chat Panel — Full Implementation

**Files:**
- Modify: `components/pipeline/pipeline-chat-panel.tsx`

**Step 1: Implement the chat panel**

Replace the stub with a full chat panel that uses `useChat` from `@ai-sdk/react` with `DefaultChatTransport` pointing to `/api/pipelines/${pipelineId}/chat`. Follow the same pattern as `components/chat/chat-panel.tsx`:

- `useChat` with `DefaultChatTransport` and `body: { pipelineId }`
- Input field at the bottom, messages scrollable above
- When the LLM calls `createMapping` / `updateMapping` / `deleteMapping` tools, call `onMappingsChanged()` to refresh the canvas
- Add a "Suggest Mappings" button in the header that sends a preset message: "Analyze both schemas and suggest mappings for all tables with matching or similar columns."

The tool results trigger `onMappingsChanged` — use `useEffect` to watch messages for tool invocations and call the callback.

**Step 2: Verify build**

Run: `pnpm build`

**Step 3: Commit**

```bash
git add components/pipeline/pipeline-chat-panel.tsx
git commit -m "feat: implement pipeline chat panel with LLM integration"
```

---

## Task 14: Export Modal — Full Implementation

**Files:**
- Modify: `components/pipeline/export-modal.tsx`

**Step 1: Implement the export modal**

Replace the stub with a Dialog that:
- Fetches generated SQL from `GET /api/pipelines/${pipelineId}/generate`
- Shows the SQL in a `<pre>` block with monospace font and horizontal scrolling
- "Copy to Clipboard" button using `navigator.clipboard.writeText()`
- "Download .sql" button that creates a Blob and triggers a download
- Uses Shadcn `Dialog`, `DialogContent`, `DialogHeader`, `DialogTitle`

**Step 2: Verify build**

Run: `pnpm build`

**Step 3: Commit**

```bash
git add components/pipeline/export-modal.tsx
git commit -m "feat: implement SQL export modal with copy and download"
```

---

## Task 15: Final Build Verification and Lint

**Step 1: Run full build**

Run: `pnpm build`
Expected: Compiles successfully with all new routes visible

**Step 2: Run lint**

Run: `pnpm lint`
Expected: No new errors from our changes (pre-existing warnings are OK)

**Step 3: Fix any issues found**

Address any TypeScript or lint errors.

**Step 4: Final commit if fixes needed**

```bash
git add -A
git commit -m "fix: resolve build/lint issues in ETL pipeline feature"
```

---

## File Summary

| File | Action | Task |
|------|--------|------|
| `prisma/schema.prisma` | Modify | 1 |
| `prisma/migrations/..._add_etl_pipeline/migration.sql` | Create | 1 |
| `app/api/pipelines/route.ts` | Create | 2 |
| `app/api/pipelines/[id]/route.ts` | Create | 2 |
| `app/api/pipelines/[id]/mappings/route.ts` | Create | 3 |
| `app/api/pipelines/[id]/mappings/[mappingId]/route.ts` | Create | 3 |
| `lib/etl/generate.ts` | Create | 4 |
| `app/api/pipelines/[id]/generate/route.ts` | Create | 5 |
| `lib/etl/agent.ts` | Create | 6 |
| `app/api/pipelines/[id]/chat/route.ts` | Create | 7 |
| `app/(app)/layout.tsx` | Modify | 8 |
| `app/(app)/pipelines/page.tsx` | Create | 9 |
| `components/pipeline/create-pipeline-dialog.tsx` | Create | 9 |
| `app/(app)/pipelines/[id]/page.tsx` | Create | 10 |
| `components/pipeline/pipeline-canvas.tsx` | Create → Implement | 10, 11 |
| `components/pipeline/mapping-detail-panel.tsx` | Create → Implement | 10, 12 |
| `components/pipeline/pipeline-chat-panel.tsx` | Create → Implement | 10, 13 |
| `components/pipeline/export-modal.tsx` | Create → Implement | 10, 14 |
