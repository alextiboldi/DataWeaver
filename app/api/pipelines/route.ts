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
    sourceDataSourceId?: string;
    destDataSourceId?: string;
  };

  if (!body.name || typeof body.name !== "string" || !body.name.trim()) {
    return NextResponse.json(
      { error: "Name is required" },
      { status: 400 }
    );
  }

  if (!body.sourceDataSourceId) {
    return NextResponse.json(
      { error: "sourceDataSourceId is required" },
      { status: 400 }
    );
  }

  if (!body.destDataSourceId) {
    return NextResponse.json(
      { error: "destDataSourceId is required" },
      { status: 400 }
    );
  }

  const pipeline = await prisma.etlPipeline.create({
    data: {
      name: body.name.trim(),
      sourceDataSourceId: body.sourceDataSourceId,
      destDataSourceId: body.destDataSourceId,
    },
  });

  return NextResponse.json({ pipeline }, { status: 201 });
}
