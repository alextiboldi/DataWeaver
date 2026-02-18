import { NextResponse } from "next/server";
import prisma from "@/lib/db";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ dataSourceId: string }> },
) {
  const { dataSourceId } = await params;

  const body = await req.json();
  const { name, displayName, description, sqlExpression } = body as {
    name: string;
    displayName: string;
    description: string;
    sqlExpression: string;
  };

  if (!name || !displayName || !sqlExpression) {
    return NextResponse.json(
      { error: "name, displayName, and sqlExpression are required" },
      { status: 400 },
    );
  }

  const model = await prisma.semanticModel.findFirst({
    where: { dataSourceId },
    orderBy: { version: "desc" },
  });

  if (!model) {
    return NextResponse.json(
      { error: "No semantic model found for this data source" },
      { status: 404 },
    );
  }

  const metric = await prisma.metricDefinition.create({
    data: {
      semanticModelId: model.id,
      name,
      displayName,
      description: description ?? "",
      sqlExpression,
    },
  });

  return NextResponse.json({ metric }, { status: 201 });
}
