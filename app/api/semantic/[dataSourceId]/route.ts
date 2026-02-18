import { NextResponse } from "next/server";
import prisma from "@/lib/db";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ dataSourceId: string }> },
) {
  const { dataSourceId } = await params;

  const model = await prisma.semanticModel.findFirst({
    where: { dataSourceId },
    include: { metrics: true },
    orderBy: { version: "desc" },
  });

  if (!model) {
    return NextResponse.json(
      { error: "No semantic model found" },
      { status: 404 },
    );
  }

  return NextResponse.json({
    model: {
      id: model.id,
      dataSourceId: model.dataSourceId,
      tables: model.tables,
      relationships: model.relationships,
      metrics: model.metrics,
    },
  });
}
