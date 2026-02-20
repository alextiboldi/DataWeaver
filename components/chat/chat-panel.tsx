"use client";

import * as React from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";

import { ChatInput } from "./chat-input";
import { MessageList } from "./message-list";

interface ChatPanelProps {
  dashboardId: string;
  initialMessages?: UIMessage[];
  isLoadingMessages?: boolean;
  onPinChart?: (data: { chartType: string; sql: string; title: string; description?: string }) => void;
}

export function ChatPanel({ dashboardId, initialMessages, isLoadingMessages, onPinChart }: ChatPanelProps): React.ReactElement {
  const [input, setInput] = React.useState("");

  const transport = React.useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        body: { dashboardId },
      }),
    [dashboardId]
  );

  const { messages, sendMessage, status } = useChat({
    transport,
    messages: initialMessages,
  });

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
      <MessageList messages={messages} onPinChart={onPinChart} isLoading={isLoadingMessages} />
      <ChatInput
        input={input}
        onInputChange={setInput}
        onSubmit={handleSubmit}
        isLoading={isLoading}
      />
    </div>
  );
}
