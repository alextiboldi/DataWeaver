import { NextResponse } from "next/server";
import { aiDocumentAll } from "@/lib/catalog/ai-document";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id } = await params;

  const result = await aiDocumentAll(id);

  return NextResponse.json(result);
}
