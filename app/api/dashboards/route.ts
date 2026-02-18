import { NextResponse } from "next/server";
import prisma from "@/lib/db";

export async function GET(): Promise<NextResponse> {
  const dashboards = await prisma.dashboard.findMany({
    orderBy: { updatedAt: "desc" },
    include: {
      _count: { select: { panels: true } },
      dataSource: { select: { id: true, name: true, type: true } },
    },
  });

  return NextResponse.json({ dashboards });
}

export async function POST(req: Request): Promise<NextResponse> {
  const body = (await req.json()) as { title?: string; dataSourceId?: string };

  if (!body.title || typeof body.title !== "string" || !body.title.trim()) {
    return NextResponse.json(
      { error: "Title is required" },
      { status: 400 }
    );
  }

  const dashboard = await prisma.dashboard.create({
    data: {
      title: body.title.trim(),
      dataSourceId: body.dataSourceId ?? null,
    },
  });

  return NextResponse.json({ dashboard }, { status: 201 });
}
