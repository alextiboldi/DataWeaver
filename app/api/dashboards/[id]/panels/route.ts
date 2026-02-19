import { NextResponse } from "next/server";
import type { Prisma } from "@/generated/prisma/client";
import prisma from "@/lib/db";

interface CreatePanelBody {
  chartType: string;
  title: string;
  description?: string;
  sql: string;
  config?: Record<string, unknown>;
  layout?: { x: number; y: number; w: number; h: number };
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { id } = await params;
  const body = (await req.json()) as CreatePanelBody;

  if (!body.chartType || !body.title || !body.sql) {
    return NextResponse.json(
      { error: "chartType, title, and sql are required" },
      { status: 400 }
    );
  }

  const [dashboard, panelCount] = await Promise.all([
    prisma.dashboard.findUnique({ where: { id } }),
    prisma.dashboardPanel.count({ where: { dashboardId: id } }),
  ]);

  if (!dashboard) {
    return NextResponse.json(
      { error: "Dashboard not found" },
      { status: 404 }
    );
  }

  const defaultLayout = body.layout ?? {
    x: (panelCount % 2) * 6,
    y: Math.floor(panelCount / 2) * 4,
    w: 6,
    h: 4,
  };

  const panel = await prisma.dashboardPanel.create({
    data: {
      dashboardId: id,
      chartType: body.chartType,
      title: body.title,
      description: body.description ?? null,
      sql: body.sql,
      config: (body.config ?? {}) as Prisma.InputJsonValue,
      layout: defaultLayout as Prisma.InputJsonValue,
    },
  });

  return NextResponse.json({ panel }, { status: 201 });
}
