import { NextResponse } from "next/server";
import prisma from "@/lib/db";

interface UpdatePanelBody {
  layout?: { x: number; y: number; w: number; h: number };
  config?: Record<string, unknown>;
  chartType?: string;
  title?: string;
  description?: string;
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string; panelId: string }> }
): Promise<NextResponse> {
  const { panelId } = await params;
  const body = (await req.json()) as UpdatePanelBody;

  const updateData: Record<string, unknown> = {};
  if (body.layout !== undefined) updateData.layout = body.layout;
  if (body.config !== undefined) updateData.config = body.config;
  if (body.chartType !== undefined) updateData.chartType = body.chartType;
  if (body.title !== undefined) updateData.title = body.title;
  if (body.description !== undefined) updateData.description = body.description;

  try {
    const panel = await prisma.dashboardPanel.update({
      where: { id: panelId },
      data: updateData,
    });
    return NextResponse.json({ panel });
  } catch {
    return NextResponse.json(
      { error: "Panel not found" },
      { status: 404 }
    );
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; panelId: string }> }
): Promise<NextResponse> {
  const { panelId } = await params;

  try {
    await prisma.dashboardPanel.delete({ where: { id: panelId } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Panel not found" },
      { status: 404 }
    );
  }
}
