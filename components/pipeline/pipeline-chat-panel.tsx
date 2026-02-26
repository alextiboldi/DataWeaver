"use client";

import * as React from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { Send, Sparkles, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

interface PipelineChatPanelProps {
  pipelineId: string;
  onMappingsChanged: () => void;
}

const MAPPING_TOOL_NAMES = new Set([
  "createMapping",
  "updateMapping",
  "deleteMapping",
]);

interface ToolPart {
  type: string;
  toolCallId: string;
  state: string;
  toolName?: string;
  input?: unknown;
  output?: unknown;
}

function isToolPart(part: { type: string }): part is ToolPart {
  return part.type.startsWith("tool-") || part.type === "dynamic-tool";
}

function getToolName(part: ToolPart): string {
  if (part.toolName) return part.toolName;
  if (part.type.startsWith("tool-") && part.type !== "tool-invocation") {
    return part.type.slice(5);
  }
  return "unknown";
}

function getToolLabel(toolName: string, input?: unknown): string {
  const args = typeof input === "object" && input !== null ? (input as Record<string, unknown>) : {};
  const name = typeof args.name === "string" ? args.name : "";
  const dest = typeof args.destTable === "string" ? args.destTable : "";
  switch (toolName) {
    case "createMapping":
      return name ? `Created mapping: ${name}` : "Created mapping";
    case "updateMapping":
      return name ? `Updated mapping: ${name}` : "Updated mapping";
    case "deleteMapping":
      return "Deleted mapping";
    case "previewQuery":
      return dest ? `Previewed query on ${dest}` : "Previewed query";
    default:
      return `${toolName} completed`;
  }
}

export function PipelineChatPanel({
  pipelineId,
  onMappingsChanged,
}: PipelineChatPanelProps): React.ReactElement {
  const [input, setInput] = React.useState("");
  const bottomRef = React.useRef<HTMLDivElement>(null);
  const prevMessageCountRef = React.useRef(0);

  const transport = React.useMemo(
    () =>
      new DefaultChatTransport({
        api: `/api/pipelines/${pipelineId}/chat`,
        body: { pipelineId },
      }),
    [pipelineId]
  );

  const { messages, sendMessage, status } = useChat({
    transport,
  });

  const isLoading = status === "submitted" || status === "streaming";

  // Auto-scroll when messages change
  React.useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Detect mapping tool calls to trigger canvas refresh
  React.useEffect(() => {
    if (messages.length <= prevMessageCountRef.current) {
      prevMessageCountRef.current = messages.length;
      return;
    }
    prevMessageCountRef.current = messages.length;

    const hasMappingToolCall = messages.some(
      (msg) =>
        msg.role === "assistant" &&
        msg.parts.some((part) => {
          const raw = part as { type: string } & Record<string, unknown>;
          if (!isToolPart(raw)) return false;
          const tp = raw as ToolPart;
          const name = getToolName(tp);
          return (
            MAPPING_TOOL_NAMES.has(name) &&
            tp.state === "output-available"
          );
        })
    );

    if (hasMappingToolCall) {
      onMappingsChanged();
    }
  }, [messages, onMappingsChanged]);

  async function handleSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;
    setInput("");
    await sendMessage({ text: trimmed });
  }

  async function handleSuggestMappings(): Promise<void> {
    if (isLoading) return;
    await sendMessage({
      text: "Analyze both schemas and suggest mappings for all tables with matching or similar columns.",
    });
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>): void {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSubmit(e);
    }
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b-2 border-black px-4 py-3">
        <h2 className="text-sm font-black uppercase tracking-tight">
          ETL Assistant
        </h2>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 text-xs"
          onClick={handleSuggestMappings}
          disabled={isLoading}
        >
          <Sparkles className="size-3" />
          Suggest Mappings
        </Button>
      </div>

      {/* Message list */}
      <ScrollArea className="flex-1 min-h-0 p-4">
        {messages.length === 0 ? (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            <div className="text-center">
              <h3 className="mb-2 text-sm font-black uppercase tracking-tight">
                ETL Assistant
              </h3>
              <p className="text-xs uppercase tracking-wider">
                Describe your data mappings or click Suggest Mappings to get started.
              </p>
            </div>
          </div>
        ) : (
          <>
            {messages.map((message) => (
              <MessageBubble key={message.id} message={message} />
            ))}
            <div ref={bottomRef} />
          </>
        )}
      </ScrollArea>

      {/* Input bar */}
      <form onSubmit={handleSubmit} className="flex items-center gap-2 border-t-2 border-black p-4">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Describe a mapping..."
          aria-label="Describe a mapping"
          disabled={isLoading}
          className="flex-1"
        />
        <Button
          type="submit"
          size="icon"
          disabled={isLoading || !input.trim()}
          aria-label="Send message"
        >
          {isLoading ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Send className="size-4" />
          )}
        </Button>
      </form>
    </div>
  );
}

function MessageBubble({ message }: { message: UIMessage }): React.ReactElement {
  const isUser = message.role === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} mb-4`}>
      <div className={`max-w-[90%] ${isUser ? "order-last" : ""}`}>
        <div className="mb-1 flex items-center gap-2">
          <Badge variant={isUser ? "default" : "secondary"}>
            {isUser ? "You" : "ETL Assistant"}
          </Badge>
        </div>
        <div className="space-y-2">
          {message.parts.map((part, i) => {
            const rawPart = part as { type: string } & Record<string, unknown>;

            if (rawPart.type === "text") {
              const textPart = part as { type: "text"; text: string };
              if (!textPart.text.trim()) return null;
              return (
                <Card
                  key={`part-${i}`}
                  className={`p-3 ${
                    isUser
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted"
                  }`}
                >
                  <div className="whitespace-pre-wrap text-sm">
                    {textPart.text}
                  </div>
                </Card>
              );
            }

            if (isToolPart(rawPart)) {
              const toolPart = rawPart as ToolPart;
              const toolName = getToolName(toolPart);

              if (
                toolPart.state === "input-streaming" ||
                toolPart.state === "input-available"
              ) {
                return (
                  <Card
                    key={`part-${i}`}
                    className="p-3 bg-muted/50 border-dashed"
                  >
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Loader2 className="size-3 animate-spin" />
                      Running {toolName}...
                    </div>
                  </Card>
                );
              }

              if (toolPart.state === "output-available") {
                const label = getToolLabel(toolName, toolPart.input);
                const result = toolPart.output;
                const isError =
                  typeof result === "object" &&
                  result !== null &&
                  (result as Record<string, unknown>).error === true;

                return (
                  <div key={`part-${i}`} className="flex items-center gap-1.5">
                    <Badge
                      variant={isError ? "destructive" : "secondary"}
                      className="text-[10px]"
                    >
                      {isError ? `Failed: ${toolName}` : label}
                    </Badge>
                  </div>
                );
              }

              if (toolPart.state === "output-error") {
                return (
                  <Card
                    key={`part-${i}`}
                    className="p-3 border-destructive/50 bg-destructive/10"
                  >
                    <div className="text-xs text-destructive">
                      {toolName} failed
                    </div>
                  </Card>
                );
              }
            }

            return null;
          })}
        </div>
      </div>
    </div>
  );
}
