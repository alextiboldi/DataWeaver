"use client";

import * as React from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { MappingData } from "@/app/(app)/pipelines/[id]/page";

interface MappingDetailPanelProps {
  mapping: MappingData;
  onClose: () => void;
}

export function MappingDetailPanel({
  mapping,
  onClose,
}: MappingDetailPanelProps): React.ReactElement {
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <h3 className="text-sm font-medium">{mapping.name}</h3>
        <Button variant="ghost" size="icon" className="size-7" onClick={onClose}>
          <X className="size-4" />
        </Button>
      </div>
      <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
        Mapping detail panel
      </div>
    </div>
  );
}
