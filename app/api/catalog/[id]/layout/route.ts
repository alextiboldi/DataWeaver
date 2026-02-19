import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { updateErdLayoutSchema } from "@/lib/types/api";

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id } = await params;
  const body: unknown = await req.json();
  const parsed = updateErdLayoutSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const catalog = await prisma.databaseDoc.update({
    where: { id },
    data: { erdLayout: parsed.data.layout },
  });

  return NextResponse.json({ erdLayout: catalog.erdLayout });
}
