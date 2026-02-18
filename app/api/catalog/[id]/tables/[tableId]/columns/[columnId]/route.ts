import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { updateColumnDocSchema } from "@/lib/types/api";

export async function PATCH(
  req: Request,
  {
    params,
  }: { params: Promise<{ id: string; tableId: string; columnId: string }> },
): Promise<NextResponse> {
  const { columnId } = await params;
  const body: unknown = await req.json();
  const parsed = updateColumnDocSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const column = await prisma.columnDoc.update({
    where: { id: columnId },
    data: parsed.data,
  });

  return NextResponse.json({ column });
}
