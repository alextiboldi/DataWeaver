"use client";

import * as React from "react";
import type { MappingData } from "@/app/(app)/pipelines/[id]/page";

interface PipelineCanvasProps {
  mappings: MappingData[];
  selectedMappingId: string | null;
  onSelectMapping: (id: string) => void;
}

export function PipelineCanvas({
  mappings,
  selectedMappingId,
  onSelectMapping,
}: PipelineCanvasProps): React.ReactElement {
  return (
    <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
      Pipeline canvas ({mappings.length} mapping{mappings.length !== 1 ? "s" : ""})
    </div>
  );
}
