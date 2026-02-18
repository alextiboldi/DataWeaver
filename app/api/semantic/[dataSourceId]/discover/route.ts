import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { discoverSemanticModel } from "@/lib/semantic/discovery";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ dataSourceId: string }> },
) {
  const { dataSourceId } = await params;

  const dataSource = await prisma.dataSource.findUnique({
    where: { id: dataSourceId },
  });

  if (!dataSource) {
    return NextResponse.json(
      { error: "Data source not found" },
      { status: 404 },
    );
  }

  const discovered = await discoverSemanticModel();

  const model = await prisma.semanticModel.create({
    data: {
      dataSourceId,
      tables: JSON.parse(JSON.stringify(discovered.tables)),
      relationships: JSON.parse(JSON.stringify(discovered.relationships)),
    },
  });

  return NextResponse.json({
    model: {
      id: model.id,
      dataSourceId: model.dataSourceId,
      tables: discovered.tables,
      relationships: discovered.relationships,
      metrics: [],
    },
    tablesFound: discovered.tablesFound,
    columnsFound: discovered.columnsFound,
  });
}
