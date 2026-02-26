"use client";

import * as React from "react";

interface ExportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pipelineId: string;
}

export function ExportModal({
  open,
  onOpenChange,
  pipelineId,
}: ExportModalProps): React.ReactElement | null {
  if (!open) return null;

  return null;
}
