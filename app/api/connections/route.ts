import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";
import { createConnectionSchema } from "@/lib/types/api";
import { discoverAndSync } from "@/lib/catalog/discover";
import { getSourceType, generateToolboxId } from "@/lib/connections/source-registry";
import { regenerateAndRestart } from "@/lib/toolbox/manager";

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

  const sourceType = getSourceType(parsed.data.type);
  if (!sourceType) {
    return NextResponse.json(
      { error: `Unsupported source type: ${parsed.data.type}` },
      { status: 400 },
    );
  }

  const toolboxId = generateToolboxId(parsed.data.name);

  // Build connectionUri from params if the type supports it
  const connectionUri =
    parsed.data.connectionUri ??
    sourceType.buildConnectionUri?.(parsed.data.connectionParams ?? {}) ??
    null;

  const connection = await prisma.dataSource.create({
    data: {
      name: parsed.data.name,
      type: parsed.data.type,
      connectionUri,
      connectionParams: (parsed.data.connectionParams ?? undefined) as Prisma.InputJsonValue | undefined,
      toolboxId,
      status: "connected",
    },
  });

  // Regenerate toolbox config and restart container
  try {
    await regenerateAndRestart();
  } catch (err) {
    console.error("[connections] Toolbox restart failed:", err);
  }

  // For PostgreSQL, run discovery if we have a URI
  let databaseDocId: string | null = null;
  if (connectionUri) {
    try {
      const databaseDoc = await discoverAndSync(
        connectionUri,
        parsed.data.name,
        parsed.data.connectionParams as Record<string, unknown> | undefined,
        parsed.data.type,
      );
      databaseDocId = databaseDoc.id;
      await prisma.dataSource.update({
        where: { id: connection.id },
        data: { databaseDocId: databaseDoc.id },
      });
    } catch (err) {
      console.error("[connections] Discovery failed:", err);
    }
  }

  return NextResponse.json(
    {
      connection: { ...connection, status: "connected" },
      databaseDocId,
    },
    { status: 201 },
  );
}
