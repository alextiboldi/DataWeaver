import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { regenerateAndRestart } from "@/lib/toolbox/manager";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id } = await params;
  const connection = await prisma.dataSource.findUnique({
    where: { id },
    include: { databaseDoc: true },
  });

  if (!connection) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ connection });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id } = await params;

  try {
    await prisma.dataSource.delete({ where: { id } });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    await regenerateAndRestart();
  } catch (err) {
    console.error("[connections] Toolbox restart after delete failed:", err);
  }

  return NextResponse.json({ success: true });
}
