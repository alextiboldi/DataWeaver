"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Database, Check, ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface DataSourceOption {
  id: string;
  name: string;
  type: string;
  status: string;
}

export function CreatePipelineDialog({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);
  const [step, setStep] = React.useState<1 | 2 | 3>(1);
  const [name, setName] = React.useState("");
  const [selectedSourceId, setSelectedSourceId] = React.useState<string | null>(null);
  const [selectedDestId, setSelectedDestId] = React.useState<string | null>(null);
  const [isCreating, setIsCreating] = React.useState(false);

  const { data: dataSources = [], isLoading: isLoadingSources } = useQuery({
    queryKey: ["connections"],
    queryFn: async () => {
      const res = await fetch("/api/connections");
      const json = (await res.json()) as { connections: DataSourceOption[] };
      return json.connections;
    },
    enabled: step === 2 || step === 3,
  });

  function reset(): void {
    setStep(1);
    setName("");
    setSelectedSourceId(null);
    setSelectedDestId(null);
  }

  function handleNext(): void {
    if (step === 1 && name.trim()) {
      setStep(2);
    } else if (step === 2 && selectedSourceId) {
      setStep(3);
    }
  }

  async function handleCreate(): Promise<void> {
    if (!name.trim() || !selectedSourceId || !selectedDestId) return;
    setIsCreating(true);
    try {
      const res = await fetch("/api/pipelines", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          sourceDataSourceId: selectedSourceId,
          destDataSourceId: selectedDestId,
        }),
      });
      if (res.ok) {
        const json = (await res.json()) as { pipeline: { id: string } };
        setOpen(false);
        reset();
        router.push(`/pipelines/${json.pipeline.id}`);
      }
    } finally {
      setIsCreating(false);
    }
  }

  if (!mounted) {
    return <>{children}</>;
  }

  const destSources = dataSources.filter((ds) => ds.id !== selectedSourceId);

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) reset();
      }}
    >
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {step === 1
              ? "Create Pipeline"
              : step === 2
                ? "Select Source"
                : "Select Destination"}
          </DialogTitle>
        </DialogHeader>

        {step === 1 ? (
          <div className="space-y-4 pt-2">
            <Input
              placeholder="Pipeline name..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleNext();
              }}
              autoFocus
            />
            <Button onClick={handleNext} className="w-full" disabled={!name.trim()}>
              Next
            </Button>
          </div>
        ) : step === 2 ? (
          <div className="space-y-4 pt-2">
            <Button
              variant="ghost"
              size="sm"
              className="gap-1 text-xs -ml-2"
              onClick={() => setStep(1)}
            >
              <ArrowLeft className="size-3" />
              Back
            </Button>

            {isLoadingSources ? (
              <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
                <Loader2 className="mr-2 size-4 animate-spin" />
                Loading data sources...
              </div>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {dataSources.map((ds) => (
                  <Card
                    key={ds.id}
                    className={`flex cursor-pointer items-center gap-3 p-3 transition-colors hover:bg-muted/50 ${
                      selectedSourceId === ds.id
                        ? "border-primary bg-primary/5"
                        : ""
                    }`}
                    onClick={() => setSelectedSourceId(ds.id)}
                  >
                    <Database className="size-4 shrink-0 text-muted-foreground" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{ds.name}</div>
                      <div className="text-xs text-muted-foreground">{ds.type}</div>
                    </div>
                    {selectedSourceId === ds.id && (
                      <Check className="size-4 text-primary shrink-0" />
                    )}
                    <Badge variant="secondary" className="text-[10px] shrink-0">
                      {ds.status}
                    </Badge>
                  </Card>
                ))}

                {dataSources.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No data sources available. Create a connection first.
                  </p>
                )}
              </div>
            )}

            <Button
              onClick={handleNext}
              className="w-full"
              disabled={!selectedSourceId}
            >
              Next
            </Button>
          </div>
        ) : (
          <div className="space-y-4 pt-2">
            <Button
              variant="ghost"
              size="sm"
              className="gap-1 text-xs -ml-2"
              onClick={() => {
                setSelectedDestId(null);
                setStep(2);
              }}
            >
              <ArrowLeft className="size-3" />
              Back
            </Button>

            {isLoadingSources ? (
              <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
                <Loader2 className="mr-2 size-4 animate-spin" />
                Loading data sources...
              </div>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {destSources.map((ds) => (
                  <Card
                    key={ds.id}
                    className={`flex cursor-pointer items-center gap-3 p-3 transition-colors hover:bg-muted/50 ${
                      selectedDestId === ds.id
                        ? "border-primary bg-primary/5"
                        : ""
                    }`}
                    onClick={() => setSelectedDestId(ds.id)}
                  >
                    <Database className="size-4 shrink-0 text-muted-foreground" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{ds.name}</div>
                      <div className="text-xs text-muted-foreground">{ds.type}</div>
                    </div>
                    {selectedDestId === ds.id && (
                      <Check className="size-4 text-primary shrink-0" />
                    )}
                    <Badge variant="secondary" className="text-[10px] shrink-0">
                      {ds.status}
                    </Badge>
                  </Card>
                ))}

                {destSources.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No other data sources available. Create another connection first.
                  </p>
                )}
              </div>
            )}

            <Button
              onClick={() => void handleCreate()}
              className="w-full"
              disabled={isCreating || !selectedDestId}
            >
              {isCreating ? "Creating..." : "Create Pipeline"}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
