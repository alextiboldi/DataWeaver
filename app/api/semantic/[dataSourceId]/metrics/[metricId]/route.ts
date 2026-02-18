import { NextResponse } from "next/server";
import prisma from "@/lib/db";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ dataSourceId: string; metricId: string }> },
) {
  const { metricId } = await params;

  await prisma.metricDefinition.delete({
    where: { id: metricId },
  });

  return NextResponse.json({ success: true });
}
