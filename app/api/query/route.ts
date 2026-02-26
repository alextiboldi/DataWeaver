import { NextResponse } from "next/server";

import { formatQueryResult } from "@/lib/agent/formatter";
import { validateQuery } from "@/lib/agent/validation";
import { getToolboxClient } from "@/lib/toolbox/client";
import { queryRequestSchema, type QueryResponse } from "@/lib/types/api";
import prisma from "@/lib/db";

export async function POST(req: Request): Promise<NextResponse<QueryResponse | { error: string; details?: unknown }>> {
  const body: unknown = await req.json();
  const parsed = queryRequestSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const validation = validateQuery(parsed.data.sql);
  if (!validation.valid) {
    return NextResponse.json(
      { error: validation.reason ?? "Invalid query" },
      { status: 400 },
    );
  }

  const ds = await prisma.dataSource.findUnique({
    where: { id: parsed.data.dataSourceId },
    select: { toolboxId: true },
  });
  const toolboxId = ds?.toolboxId ?? "sample-pg";

  try {
    const client = getToolboxClient();
    const result = await client.executeTool(`${toolboxId}-execute-sql`, {
      sql: parsed.data.sql,
    });
    const formatted = formatQueryResult(result);
    return NextResponse.json(formatted);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Query execution failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
