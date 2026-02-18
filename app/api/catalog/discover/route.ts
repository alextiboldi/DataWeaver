import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { discoverCatalogSchema } from "@/lib/types/api";
import { discoverAndSync } from "@/lib/catalog/discover";

export async function POST(req: Request): Promise<NextResponse> {
  const body: unknown = await req.json();
  const parsed = discoverCatalogSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const dataSource = await prisma.dataSource.findUnique({
    where: { id: parsed.data.dataSourceId },
  });

  if (!dataSource || !dataSource.connectionUri) {
    return NextResponse.json(
      { error: "Data source not found or missing connection URI" },
      { status: 404 },
    );
  }

  const databaseDoc = await discoverAndSync(
    dataSource.connectionUri,
    dataSource.name,
  );

  await prisma.dataSource.update({
    where: { id: dataSource.id },
    data: { databaseDocId: databaseDoc.id },
  });

  return NextResponse.json({ databaseDoc }, { status: 201 });
}
