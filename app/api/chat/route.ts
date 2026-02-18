import { type UIMessage } from "ai";

import { createAgentStream } from "@/lib/agent";

export const maxDuration = 60;

export async function POST(req: Request): Promise<Response> {
  const body = (await req.json()) as {
    messages: UIMessage[];
    conversationId?: string;
    dataSourceId?: string;
  };

  const result = await createAgentStream(body.messages, body.dataSourceId);

  return result.toUIMessageStreamResponse();
}
