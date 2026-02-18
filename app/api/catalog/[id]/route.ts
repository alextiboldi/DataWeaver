import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { updateDatabaseDocSchema } from "@/lib/types/api";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id } = await params;

  const catalog = await prisma.databaseDoc.findUnique({
    where: { id },
    include: {
      tables: {
        include: { columns: true },
        orderBy: { tableName: "asc" },
      },
    },
  });

  if (!catalog) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ catalog });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id } = await params;
  const body: unknown = await req.json();
  const parsed = updateDatabaseDocSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const catalog = await prisma.databaseDoc.update({
    where: { id },
    data: parsed.data,
  });

  return NextResponse.json({ catalog });
}
