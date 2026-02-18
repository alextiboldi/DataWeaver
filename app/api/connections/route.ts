import { NextResponse } from "next/server";

import prisma from "@/lib/db";
import {
  createConnectionSchema,
  type ConnectionTestResult,
} from "@/lib/types/api";

export async function GET(): Promise<NextResponse> {
  const connections = await prisma.dataSource.findMany({
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ connections });
}

export async function POST(req: Request): Promise<NextResponse> {
  const body: unknown = await req.json();
  const parsed = createConnectionSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const connection = await prisma.dataSource.create({
    data: {
      name: parsed.data.name,
      type: parsed.data.type,
      connectionUri: parsed.data.connectionUri,
      toolboxId: `source-${Date.now()}`,
      status: "pending",
    },
  });

  // TODO: test connection via Toolbox
  const testResult: ConnectionTestResult = { success: true };

  let databaseDocId: string | null = null;

  if (testResult.success) {
    await prisma.dataSource.update({
      where: { id: connection.id },
      data: { status: "connected" },
    });

    // TODO: Auto-discover catalog (Task 4.1: discoverAndSync)
  }

  return NextResponse.json(
    {
      connection: {
        ...connection,
        status: testResult.success ? "connected" : "error",
      },
      testResult,
      databaseDocId,
    },
    { status: 201 },
  );
}
