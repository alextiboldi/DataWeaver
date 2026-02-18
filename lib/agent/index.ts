import { google } from "@ai-sdk/google";
import {
  streamText,
  convertToModelMessages,
  stepCountIs,
  type UIMessage,
} from "ai";
import { agentTools } from "./tools";
import { buildSystemPrompt } from "./prompts";
import { introspectSchema } from "@/lib/toolbox/introspect";
import prisma from "@/lib/db";

let cachedSchema: Awaited<ReturnType<typeof introspectSchema>> | null = null;

async function getSchema() {
  if (!cachedSchema) {
    cachedSchema = await introspectSchema();
  }
  return cachedSchema;
}

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
  const [schema, catalogDoc] = await Promise.all([
    getSchema(),
    getCatalogDoc(dataSourceId),
  ]);
  const systemPrompt = buildSystemPrompt(schema, catalogDoc);

  return streamText({
    model: google("gemini-2.5-flash"),
    system: systemPrompt,
    messages: await convertToModelMessages(messages),
    tools: agentTools,
    stopWhen: stepCountIs(10),
  });
}
