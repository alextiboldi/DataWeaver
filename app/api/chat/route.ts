import { type UIMessage } from "ai";

import { createAgentStream } from "@/lib/agent";
import prisma from "@/lib/db";

export const maxDuration = 60;

async function getOrCreateConversation(dashboardId: string): Promise<{
  conversationId: string;
  dataSourceId: string | null;
}> {
  const dashboard = await prisma.dashboard.findUniqueOrThrow({
    where: { id: dashboardId },
    select: { conversationId: true, dataSourceId: true },
  });

  if (dashboard.conversationId) {
    return {
      conversationId: dashboard.conversationId,
      dataSourceId: dashboard.dataSourceId,
    };
  }

  const conversation = await prisma.conversation.create({
    data: {},
  });

  await prisma.dashboard.update({
    where: { id: dashboardId },
    data: { conversationId: conversation.id },
  });

  return {
    conversationId: conversation.id,
    dataSourceId: dashboard.dataSourceId,
  };
}

export async function POST(req: Request): Promise<Response> {
  const body = (await req.json()) as {
    messages: UIMessage[];
    dashboardId?: string;
  };

  const { messages } = body;

  let conversationId: string | undefined;
  let dataSourceId: string | undefined;

  if (body.dashboardId) {
    const result = await getOrCreateConversation(body.dashboardId);
    conversationId = result.conversationId;
    dataSourceId = result.dataSourceId ?? undefined;
  }

  // Save the latest user message
  const lastMessage = messages[messages.length - 1];
  if (conversationId && lastMessage?.role === "user") {
    const textContent = lastMessage.parts
      .filter((p): p is { type: "text"; text: string } => p.type === "text")
      .map((p) => p.text)
      .join("\n");

    await prisma.message.create({
      data: {
        conversationId,
        role: lastMessage.role,
        content: textContent,
        metadata: { parts: JSON.parse(JSON.stringify(lastMessage.parts)) },
      },
    });
  }

  const result = await createAgentStream(messages, dataSourceId);

  return result.toUIMessageStreamResponse({
    async onFinish({ responseMessage }) {
      if (!conversationId) return;

      const textContent = responseMessage.parts
        .filter((p): p is { type: "text"; text: string } => p.type === "text")
        .map((p) => p.text)
        .join("\n");

      await prisma.message.create({
        data: {
          conversationId,
          role: "assistant",
          content: textContent,
          metadata: JSON.parse(JSON.stringify({ parts: responseMessage.parts })),
        },
      });
    },
  });
}
