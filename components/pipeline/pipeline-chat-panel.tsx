"use client";

import * as React from "react";

interface PipelineChatPanelProps {
  pipelineId: string;
}

export function PipelineChatPanel({
  pipelineId,
}: PipelineChatPanelProps): React.ReactElement {
  return (
    <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
      Pipeline chat
    </div>
  );
}
