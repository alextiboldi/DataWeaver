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
        include: {
          databaseDoc: {
            include: {
              tables: {
                include: { columns: true },
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
                include: { columns: true },
              },
            },
          },
        },
      },
    },
  });

  if (!pipeline) {
    return NextResponse.json(
      { error: "Pipeline not found" },
      { status: 404 }
    );
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

  const updateData: Record<string, unknown> = {};
  if (body.name !== undefined) updateData.name = body.name;
  if (body.description !== undefined) updateData.description = body.description;
  if (body.status !== undefined) updateData.status = body.status;

  try {
    const pipeline = await prisma.etlPipeline.update({
      where: { id },
      data: updateData,
    });
    return NextResponse.json({ pipeline });
  } catch {
    return NextResponse.json(
      { error: "Pipeline not found" },
      { status: 404 }
    );
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
    return NextResponse.json(
      { error: "Pipeline not found" },
      { status: 404 }
    );
  }
}
