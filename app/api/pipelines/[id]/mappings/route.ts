import { NextResponse } from "next/server";
import type { Prisma } from "@/generated/prisma/client";
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
    columnMappings?: Record<string, unknown>;
    conflictStrategy?: string;
  };

  if (!body.name || typeof body.name !== "string" || !body.name.trim()) {
    return NextResponse.json(
      { error: "Name is required" },
      { status: 400 }
    );
  }

  if (!body.destTable || typeof body.destTable !== "string" || !body.destTable.trim()) {
    return NextResponse.json(
      { error: "destTable is required" },
      { status: 400 }
    );
  }

  const pipeline = await prisma.etlPipeline.findUnique({ where: { id } });

  if (!pipeline) {
    return NextResponse.json(
      { error: "Pipeline not found" },
      { status: 404 }
    );
  }

  const maxOrder = await prisma.etlMapping.aggregate({
    where: { pipelineId: id },
    _max: { orderIndex: true },
  });

  const nextOrder = (maxOrder._max.orderIndex ?? -1) + 1;

  const mapping = await prisma.etlMapping.create({
    data: {
      pipelineId: id,
      name: body.name.trim(),
      sourceQuery: body.sourceQuery ?? "",
      destTable: body.destTable.trim(),
      columnMappings: (body.columnMappings ?? {}) as Prisma.InputJsonValue,
      conflictStrategy: body.conflictStrategy ?? "insert",
      orderIndex: nextOrder,
    },
  });

  return NextResponse.json({ mapping }, { status: 201 });
}
