import { NextResponse } from "next/server";
import { aiDocumentTable } from "@/lib/catalog/ai-document";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string; tableId: string }> },
): Promise<NextResponse> {
  const { tableId } = await params;

  const result = await aiDocumentTable(tableId);

  return NextResponse.json(result);
}
