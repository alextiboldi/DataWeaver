import { NextResponse } from "next/server";
import prisma from "@/lib/db";

export async function GET(): Promise<NextResponse> {
  const catalogs = await prisma.databaseDoc.findMany({
    include: {
      tables: {
        select: {
          id: true,
          description: true,
        },
      },
      _count: { select: { tables: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const result = catalogs.map((c) => ({
    id: c.id,
    name: c.name,
    description: c.description,
    fingerprint: c.fingerprint,
    tableCount: c._count.tables,
    documentedCount: c.tables.filter((t) => t.description !== null).length,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
  }));

  return NextResponse.json({ catalogs: result });
}
