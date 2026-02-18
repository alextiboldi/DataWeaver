import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { updateTableDocSchema } from "@/lib/types/api";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string; tableId: string }> },
): Promise<NextResponse> {
  const { tableId } = await params;

  const table = await prisma.tableDoc.findUnique({
    where: { id: tableId },
    include: { columns: { orderBy: { columnName: "asc" } } },
  });

  if (!table) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ table });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string; tableId: string }> },
): Promise<NextResponse> {
  const { tableId } = await params;
  const body: unknown = await req.json();
  const parsed = updateTableDocSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const table = await prisma.tableDoc.update({
    where: { id: tableId },
    data: parsed.data,
  });

  return NextResponse.json({ table });
}
