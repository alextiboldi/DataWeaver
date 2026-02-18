"use client";

import * as React from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";

import { ChatInput } from "./chat-input";
import { MessageList } from "./message-list";

interface ChatPanelProps {
  dataSourceId?: string;
  onPinChart?: (data: { chartType: string; sql: string; title: string }) => void;
}

export function ChatPanel({ dataSourceId, onPinChart }: ChatPanelProps): React.ReactElement {
  const [input, setInput] = React.useState("");

  const transport = React.useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        body: dataSourceId ? { dataSourceId } : undefined,
      }),
    [dataSourceId]
  );

  const { messages, sendMessage, status } = useChat({ transport });

  const isLoading = status === "submitted" || status === "streaming";

  async function handleSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;
    setInput("");
    await sendMessage({ text: trimmed });
  }

  return (
    <div className="flex h-full flex-col">
      <MessageList messages={messages} onPinChart={onPinChart} />
      <ChatInput
        input={input}
        onInputChange={setInput}
        onSubmit={handleSubmit}
        isLoading={isLoading}
      />
    </div>
  );
}
