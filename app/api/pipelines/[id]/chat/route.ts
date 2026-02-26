import { type UIMessage } from "ai";

import prisma from "@/lib/db";
import { createEtlAgentStream } from "@/lib/etl/agent";

export const maxDuration = 60;

interface SchemaTable {
  tableName: string;
  displayName: string;
  description: string | null;
  columns: {
    columnName: string;
    displayName: string;
    description: string | null;
    dataType: string;
    isPrimaryKey: boolean;
    isForeignKey: boolean;
  }[];
}

function mapTablesToSchema(
  tables: {
    tableName: string;
    displayName: string;
    description: string | null;
    columns: {
      columnName: string;
      displayName: string;
      description: string | null;
      dataType: string;
      isPrimaryKey: boolean;
      isForeignKey: boolean;
    }[];
  }[]
): SchemaTable[] {
  return tables.map((t) => ({
    tableName: t.tableName,
    displayName: t.displayName,
    description: t.description,
    columns: t.columns.map((c) => ({
      columnName: c.columnName,
      displayName: c.displayName,
      description: c.description,
      dataType: c.dataType,
      isPrimaryKey: c.isPrimaryKey,
      isForeignKey: c.isForeignKey,
    })),
  }));
}

async function getOrCreateConversation(pipelineId: string): Promise<string> {
  const pipeline = await prisma.etlPipeline.findUniqueOrThrow({
    where: { id: pipelineId },
    select: { conversationId: true },
  });

  if (pipeline.conversationId) {
    return pipeline.conversationId;
  }

  const conversation = await prisma.conversation.create({
    data: {},
  });

  await prisma.etlPipeline.update({
    where: { id: pipelineId },
    data: { conversationId: conversation.id },
  });

  return conversation.id;
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  const { id } = await params;
  const body = (await req.json()) as { messages: UIMessage[] };
  const { messages } = body;

  const pipeline = await prisma.etlPipeline.findUnique({
    where: { id },
    include: {
      sourceDataSource: {
        include: {
          databaseDoc: {
            include: {
              tables: {
                include: { columns: true },
              },
            },
          },
        },
      },
      destDataSource: {
        include: {
          databaseDoc: {
            include: {
              tables: {
                include: { columns: true },
              },
            },
          },
        },
      },
    },
  });

  if (!pipeline) {
    return new Response(JSON.stringify({ error: "Pipeline not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  const sourceTables = mapTablesToSchema(
    pipeline.sourceDataSource.databaseDoc?.tables ?? []
  );
  const destTables = mapTablesToSchema(
    pipeline.destDataSource.databaseDoc?.tables ?? []
  );

  // Ensure conversation exists
  const conversationId = await getOrCreateConversation(id);

  // Save the latest user message
  const lastMessage = messages[messages.length - 1];
  if (lastMessage?.role === "user") {
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

  const result = await createEtlAgentStream(
    id,
    messages,
    sourceTables,
    destTables
  );

  return result.toUIMessageStreamResponse({
    async onFinish({ responseMessage }) {
      const textContent = responseMessage.parts
        .filter((p): p is { type: "text"; text: string } => p.type === "text")
        .map((p) => p.text)
        .join("\n");

      await prisma.message.create({
        data: {
          conversationId,
          role: "assistant",
          content: textContent,
          metadata: JSON.parse(
            JSON.stringify({ parts: responseMessage.parts })
          ),
        },
      });
    },
  });
}
