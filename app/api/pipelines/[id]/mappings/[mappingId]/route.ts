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
    columnMappings?: Record<string, unknown>;
    conflictStrategy?: string;
    orderIndex?: number;
  };

  const updateData: Record<string, unknown> = {};
  if (body.name !== undefined) updateData.name = body.name;
  if (body.sourceQuery !== undefined) updateData.sourceQuery = body.sourceQuery;
  if (body.destTable !== undefined) updateData.destTable = body.destTable;
  if (body.columnMappings !== undefined) updateData.columnMappings = body.columnMappings;
  if (body.conflictStrategy !== undefined) updateData.conflictStrategy = body.conflictStrategy;
  if (body.orderIndex !== undefined) updateData.orderIndex = body.orderIndex;

  try {
    const mapping = await prisma.etlMapping.update({
      where: { id: mappingId },
      data: updateData,
    });
    return NextResponse.json({ mapping });
  } catch {
    return NextResponse.json(
      { error: "Mapping not found" },
      { status: 404 }
    );
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
    return NextResponse.json(
      { error: "Mapping not found" },
      { status: 404 }
    );
  }
}
