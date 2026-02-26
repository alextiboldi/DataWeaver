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
