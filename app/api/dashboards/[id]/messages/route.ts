import { NextResponse } from "next/server";
import type { UIMessage } from "ai";
import prisma from "@/lib/db";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { id } = await params;

  const dashboard = await prisma.dashboard.findUnique({
    where: { id },
    include: {
      conversation: {
        include: {
          messages: { orderBy: { createdAt: "asc" } },
        },
      },
    },
  });

  if (!dashboard) {
    return NextResponse.json(
      { error: "Dashboard not found" },
      { status: 404 }
    );
  }

  if (!dashboard.conversation) {
    return NextResponse.json({ messages: [] });
  }

  const messages: UIMessage[] = dashboard.conversation.messages.map((msg) => {
    const metadata = msg.metadata as Record<string, unknown> | null;
    const parts = metadata?.parts as UIMessage["parts"] | undefined;

    return {
      id: msg.id,
      role: msg.role as UIMessage["role"],
      content: msg.content,
      parts: parts ?? [{ type: "text", text: msg.content }],
    };
  });

  return NextResponse.json({ messages });
}
