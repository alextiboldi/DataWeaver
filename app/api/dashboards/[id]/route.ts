import { NextResponse } from "next/server";
import prisma from "@/lib/db";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { id } = await params;

  const dashboard = await prisma.dashboard.findUnique({
    where: { id },
    include: {
      panels: { orderBy: { createdAt: "asc" } },
      dataSource: { select: { id: true, name: true, type: true } },
    },
  });

  if (!dashboard) {
    return NextResponse.json(
      { error: "Dashboard not found" },
      { status: 404 }
    );
  }

  return NextResponse.json({ dashboard });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { id } = await params;

  try {
    await prisma.dashboard.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Dashboard not found" },
      { status: 404 }
    );
  }
}
