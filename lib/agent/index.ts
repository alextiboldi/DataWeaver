import { google } from "@ai-sdk/google";
import {
  streamText,
  convertToModelMessages,
  stepCountIs,
  type UIMessage,
} from "ai";
import { createAgentTools } from "./tools";
import { buildSystemPrompt } from "./prompts";
import { introspectSchema } from "@/lib/toolbox/introspect";
import prisma from "@/lib/db";

async function getCatalogDoc(dataSourceId?: string) {
  if (!dataSourceId) return null;

  const dataSource = await prisma.dataSource.findUnique({
    where: { id: dataSourceId },
    include: {
      databaseDoc: {
        include: {
          tables: {
            include: {
              columns: {
                select: {
                  columnName: true,
                  displayName: true,
                  description: true,
                },
              },
            },
          },
        },
      },
    },
  });

  return dataSource?.databaseDoc ?? null;
}

export async function createAgentStream(
  messages: UIMessage[],
  dataSourceId?: string
) {
  let toolboxId = "sample-pg"; // fallback for legacy
  if (dataSourceId) {
    const ds = await prisma.dataSource.findUnique({
      where: { id: dataSourceId },
      select: { toolboxId: true },
    });
    if (ds) toolboxId = ds.toolboxId;
  }

  const [schema, catalogDoc] = await Promise.all([
    introspectSchema(toolboxId),
    getCatalogDoc(dataSourceId),
  ]);
  const systemPrompt = buildSystemPrompt(schema, catalogDoc);

  return streamText({
    model: google("gemini-2.5-flash"),
    system: systemPrompt,
    messages: await convertToModelMessages(messages),
    tools: createAgentTools(toolboxId),
    stopWhen: stepCountIs(10),
  });
}
