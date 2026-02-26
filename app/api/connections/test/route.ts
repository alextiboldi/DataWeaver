import { NextResponse } from "next/server";
import { testConnectionSchema } from "@/lib/types/api";
import { testConnection } from "@/lib/connections/test-connection";

export async function POST(req: Request): Promise<NextResponse> {
  const body: unknown = await req.json();
  const parsed = testConnectionSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const result = await testConnection(
    parsed.data.type,
    parsed.data.connectionParams ?? {}
  );

  return NextResponse.json(result);
}
