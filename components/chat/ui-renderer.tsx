"use client";

import * as React from "react";
import { Renderer, JSONUIProvider } from "@json-render/react";
import { chatRegistry } from "@/lib/render/registry";
import type { Spec } from "@json-render/core";

interface UIRendererProps {
  spec: Record<string, unknown>;
  title?: string;
}

function normalizeSpec(raw: Record<string, unknown>): Spec {
  const elements = raw.elements as
    | Record<string, Record<string, unknown>>
    | undefined;
  if (!elements) return raw as unknown as Spec;

  const normalized: Record<string, Record<string, unknown>> = {};
  for (const [key, el] of Object.entries(elements)) {
    normalized[key] = {
      ...el,
      children: Array.isArray(el.children) ? el.children : [],
    };
  }

  return { ...raw, elements: normalized } as unknown as Spec;
}

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { error: Error | null }
> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("[UIRenderer] React error boundary caught:", error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="border border-red-500 bg-red-50 p-3 text-xs text-red-800">
          <div className="font-bold">Render error</div>
          <pre className="mt-1 whitespace-pre-wrap">{this.state.error.message}</pre>
        </div>
      );
    }
    return this.props.children;
  }
}

export function UIRenderer({ spec, title }: UIRendererProps) {
  const normalized = normalizeSpec(spec);

  return (
    <div className="space-y-2">
      {title && (
        <h3 className="text-sm font-bold uppercase tracking-wide">{title}</h3>
      )}
      <ErrorBoundary>
        <JSONUIProvider registry={chatRegistry}>
          <Renderer
            spec={normalized}
            registry={chatRegistry}
          />
        </JSONUIProvider>
      </ErrorBoundary>
    </div>
  );
}
