"use client";

import * as React from "react";
import type { UIMessage } from "ai";

import { ScrollArea } from "@/components/ui/scroll-area";
import { Message } from "./message";

interface MessageListProps {
  messages: UIMessage[];
  onPinChart?: (data: { chartType: string; sql: string; title: string }) => void;
}

export function MessageList({ messages, onPinChart }: MessageListProps): React.ReactElement {
  const bottomRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <ScrollArea className="flex-1 min-h-0 p-4">
      {messages.length === 0 ? (
        <div className="flex h-full items-center justify-center text-muted-foreground">
          <div className="text-center">
            <h2 className="mb-2 text-lg font-black uppercase tracking-tight">Welcome to DataWeaver</h2>
            <p className="text-sm uppercase tracking-wider">
              Ask a question about your data to get started.
            </p>
          </div>
        </div>
      ) : (
        <>
          {messages.map((message) => (
            <Message key={message.id} message={message} onPinChart={onPinChart} />
          ))}
          <div ref={bottomRef} />
        </>
      )}
    </ScrollArea>
  );
}
