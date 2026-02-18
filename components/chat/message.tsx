"use client";

import * as React from "react";
import type { UIMessage } from "ai";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ChartCard } from "@/components/viz/chart-card";
import { UIRenderer } from "@/components/chat/ui-renderer";
import type { QueryResponse } from "@/lib/types/api";

interface MessageProps {
  message: UIMessage;
  onPinChart?: (data: { chartType: string; sql: string; title: string }) => void;
}

interface ToolResultData {
  error: boolean;
  explanation?: string;
  columns?: QueryResponse["columns"];
  rows?: QueryResponse["rows"];
  rowCount?: number;
  executionMs?: number;
  message?: string;
  failedSql?: string;
  suggestion?: string;
  comparison?: {
    a: {
      label: string;
      sql: string;
      columns: QueryResponse["columns"];
      rows: QueryResponse["rows"];
      rowCount: number;
      executionMs: number;
    };
    b: {
      label: string;
      sql: string;
      columns: QueryResponse["columns"];
      rows: QueryResponse["rows"];
      rowCount: number;
      executionMs: number;
    };
  };
}

interface ToolPart {
  type: string;
  toolCallId: string;
  state: string;
  input?: unknown;
  output?: unknown;
  toolName?: string;
  errorText?: string;
}

function isToolPart(part: { type: string }): part is ToolPart {
  return (
    (part.type.startsWith("tool-") && part.type !== "tool-invocation") ||
    part.type === "dynamic-tool"
  );
}

function getToolName(part: ToolPart): string {
  if (part.type === "dynamic-tool") {
    return (part as ToolPart & { toolName: string }).toolName ?? "unknown";
  }
  return part.type.slice(5);
}

function isOutputReady(part: ToolPart): boolean {
  return part.state === "output-available";
}

function isInProgress(part: ToolPart): boolean {
  return (
    part.state === "input-streaming" ||
    part.state === "input-available"
  );
}

function isOutputError(part: ToolPart): boolean {
  return part.state === "output-error";
}

function hasFollowingRenderUI(
  parts: UIMessage["parts"],
  currentIndex: number
): boolean {
  for (let j = currentIndex + 1; j < parts.length; j++) {
    const next = parts[j] as { type: string } & Record<string, unknown>;
    if (!isToolPart(next)) continue;
    const nextTool = next as ToolPart;
    const name = getToolName(nextTool);
    if (name === "renderUI" && isOutputReady(nextTool)) return true;
    if (name !== "renderUI" && name !== "getSchema" && isOutputReady(nextTool)) break;
  }
  return false;
}

function isQueryResult(
  result: unknown
): result is ToolResultData & {
  columns: QueryResponse["columns"];
  rows: QueryResponse["rows"];
} {
  if (typeof result !== "object" || result === null) return false;
  const r = result as Record<string, unknown>;
  return Array.isArray(r.columns) && Array.isArray(r.rows);
}

function isComparisonResult(
  result: unknown
): result is ToolResultData & { comparison: NonNullable<ToolResultData["comparison"]> } {
  if (typeof result !== "object" || result === null) return false;
  const r = result as Record<string, unknown>;
  return (
    typeof r.comparison === "object" &&
    r.comparison !== null &&
    "a" in (r.comparison as Record<string, unknown>) &&
    "b" in (r.comparison as Record<string, unknown>)
  );
}

function extractSqlFromParts(
  parts: UIMessage["parts"],
  currentIndex: number
): string {
  const current = parts[currentIndex] as { type: string } & Record<string, unknown>;
  if (isToolPart(current)) {
    const input = (current as ToolPart).input as Record<string, unknown> | undefined;
    if (input && typeof input.sql === "string") {
      return input.sql;
    }
  }
  for (let i = currentIndex - 1; i >= 0; i--) {
    const part = parts[i] as { type: string } & Record<string, unknown>;
    if (isToolPart(part) && getToolName(part as ToolPart) === "executeQuery") {
      const input = (part as ToolPart).input as Record<string, unknown> | undefined;
      if (input && typeof input.sql === "string") {
        return input.sql;
      }
    }
  }
  return "";
}

function shouldShowStepSeparator(
  parts: UIMessage["parts"],
  index: number
): boolean {
  if (index === 0) return false;
  const current = parts[index] as { type: string } & Record<string, unknown>;
  const previous = parts[index - 1] as { type: string } & Record<string, unknown>;

  if (current.type === "text" && isToolPart(previous)) {
    if (isOutputReady(previous as ToolPart)) {
      return true;
    }
  }

  return false;
}

export function Message({ message, onPinChart }: MessageProps): React.ReactElement {
  const isUser = message.role === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} mb-4`}>
      <div className={`max-w-[80%] ${isUser ? "order-last" : ""}`}>
        <div className="mb-1 flex items-center gap-2">
          <Badge variant={isUser ? "default" : "secondary"}>
            {isUser ? "You" : "DataWeaver"}
          </Badge>
        </div>
        <div className="space-y-3">
          {message.parts.map((part, i) => {
            const elements: React.ReactElement[] = [];
            const rawPart = part as { type: string } & Record<string, unknown>;

            if (!isUser && shouldShowStepSeparator(message.parts, i)) {
              elements.push(
                <div key={`sep-${i}`} className="py-1">
                  <Separator className="opacity-50" />
                </div>
              );
            }

            if (rawPart.type === "text") {
              const textPart = part as { type: "text"; text: string };
              if (!textPart.text.trim()) return null;
              elements.push(
                <Card
                  key={`part-${i}`}
                  className={`p-3 ${isUser ? "bg-primary text-primary-foreground" : "bg-muted"}`}
                >
                  {isUser ? (
                    <div className="whitespace-pre-wrap text-sm">
                      {textPart.text}
                    </div>
                  ) : (
                    <div className="markdown-body text-sm">
                      <Markdown remarkPlugins={[remarkGfm]}>
                        {textPart.text}
                      </Markdown>
                    </div>
                  )}
                </Card>
              );
            }

            if (isToolPart(rawPart)) {
              const toolPart = rawPart as ToolPart;
              const toolName = getToolName(toolPart);

              if (isInProgress(toolPart)) {
                const input = toolPart.input as Record<string, unknown> | undefined;
                elements.push(
                  <Card
                    key={`part-${i}`}
                    className="p-3 bg-muted/50 border-dashed"
                  >
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <div className="size-2 animate-pulse rounded-full bg-primary" />
                      Running {toolName}
                      {input?.explanation
                        ? `: ${String(input.explanation)}`
                        : "..."}
                    </div>
                  </Card>
                );
              }

              if (isOutputReady(toolPart)) {
                const result = toolPart.output as unknown;

                if (
                  toolName === "renderUI" &&
                  typeof result === "object" &&
                  result !== null &&
                  (result as Record<string, unknown>).type === "ui-render"
                ) {
                  const uiResult = result as {
                    type: string;
                    spec: Record<string, unknown>;
                    title?: string;
                  };
                  elements.push(
                    <Card key={`part-${i}`} className="p-4">
                      <UIRenderer
                        spec={uiResult.spec}
                        title={uiResult.title}
                      />
                    </Card>
                  );
                } else if (isComparisonResult(result)) {
                  const { comparison } = result;
                  const responseA: QueryResponse = {
                    columns: comparison.a.columns,
                    rows: comparison.a.rows,
                    rowCount: comparison.a.rowCount,
                    executionMs: comparison.a.executionMs,
                  };
                  const responseB: QueryResponse = {
                    columns: comparison.b.columns,
                    rows: comparison.b.rows,
                    rowCount: comparison.b.rowCount,
                    executionMs: comparison.b.executionMs,
                  };

                  elements.push(
                    <div key={`part-${i}`} className="space-y-3">
                      <ChartCard
                        data={responseA}
                        sql={comparison.a.sql}
                        title={comparison.a.label}
                        onPin={onPinChart ? (chartType, sqlStr) => onPinChart({ chartType, sql: sqlStr, title: comparison.a.label }) : undefined}
                      />
                      <ChartCard
                        data={responseB}
                        sql={comparison.b.sql}
                        title={comparison.b.label}
                        onPin={onPinChart ? (chartType, sqlStr) => onPinChart({ chartType, sql: sqlStr, title: comparison.b.label }) : undefined}
                      />
                    </div>
                  );
                } else if (isQueryResult(result) && !hasFollowingRenderUI(message.parts, i)) {
                  const queryResponse: QueryResponse = {
                    columns: result.columns,
                    rows: result.rows,
                    rowCount: result.rowCount ?? result.rows.length,
                    executionMs: result.executionMs ?? 0,
                  };

                  const sql = extractSqlFromParts(message.parts, i);
                  const explanation =
                    typeof (result as ToolResultData).explanation === "string"
                      ? (result as ToolResultData).explanation
                      : undefined;

                  elements.push(
                    <ChartCard
                      key={`part-${i}`}
                      data={queryResponse}
                      sql={sql}
                      title={explanation}
                      onPin={onPinChart ? (chartType, sqlStr) => onPinChart({ chartType, sql: sqlStr, title: explanation ?? "Query Result" }) : undefined}
                    />
                  );
                } else if ((result as ToolResultData).error) {
                  const errorResult = result as ToolResultData;
                  elements.push(
                    <Card
                      key={`part-${i}`}
                      className="p-3 border-destructive/50 bg-destructive/10"
                    >
                      <div className="text-sm text-destructive">
                        {errorResult.message ?? "Query failed"}
                      </div>
                      {errorResult.suggestion && (
                        <div className="mt-1 text-xs text-muted-foreground">
                          {errorResult.suggestion}
                        </div>
                      )}
                    </Card>
                  );
                } else {
                  elements.push(
                    <Card key={`part-${i}`} className="p-3 bg-muted/50">
                      <div className="text-xs text-muted-foreground">
                        {toolName} completed
                      </div>
                    </Card>
                  );
                }
              }

              if (isOutputError(toolPart)) {
                elements.push(
                  <Card
                    key={`part-${i}`}
                    className="p-3 border-destructive/50 bg-destructive/10"
                  >
                    <div className="text-sm text-destructive">
                      {toolName} failed: {toolPart.errorText ?? "Unknown error"}
                    </div>
                  </Card>
                );
              }
            }

            if (elements.length === 0) return null;
            return <React.Fragment key={i}>{elements}</React.Fragment>;
          })}
        </div>
      </div>
    </div>
  );
}
