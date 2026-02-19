"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Plus, Database, Check, ArrowLeft, Loader2 } from "lucide-react";
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

export function CreateDashboardDialog({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);
  const [step, setStep] = React.useState<1 | 2>(1);
  const [title, setTitle] = React.useState("");
  const [selectedSourceId, setSelectedSourceId] = React.useState<string | null>(null);
  const [showNewConnection, setShowNewConnection] = React.useState(false);
  const [newConnName, setNewConnName] = React.useState("");
  const [newConnUri, setNewConnUri] = React.useState("");
  const [isCreatingConn, setIsCreatingConn] = React.useState(false);
  const [isCreating, setIsCreating] = React.useState(false);
  const [localSources, setLocalSources] = React.useState<DataSourceOption[]>([]);

  const { data: fetchedSources, isLoading: isLoadingSources } = useQuery({
    queryKey: ["connections"],
    queryFn: async () => {
      const res = await fetch("/api/connections");
      const json = (await res.json()) as { connections: DataSourceOption[] };
      return json.connections;
    },
    enabled: step === 2,
  });

  const dataSources = localSources.length > 0 ? localSources : (fetchedSources ?? []);

  React.useEffect(() => {
    if (fetchedSources) {
      setLocalSources(fetchedSources);
    }
  }, [fetchedSources]);

  function reset(): void {
    setStep(1);
    setTitle("");
    setSelectedSourceId(null);
    setShowNewConnection(false);
    setNewConnName("");
    setNewConnUri("");
    setLocalSources([]);
  }

  function handleNext(): void {
    if (!title.trim()) return;
    setStep(2);
  }

  async function handleCreateConnection(): Promise<void> {
    if (!newConnName.trim() || !newConnUri.trim()) return;
    setIsCreatingConn(true);
    try {
      const res = await fetch("/api/connections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newConnName.trim(), type: "postgresql", connectionUri: newConnUri.trim() }),
      });
      if (res.ok) {
        const json = (await res.json()) as { connection: DataSourceOption };
        setLocalSources((prev) => [json.connection, ...prev]);
        setSelectedSourceId(json.connection.id);
        setShowNewConnection(false);
        setNewConnName("");
        setNewConnUri("");
      }
    } finally {
      setIsCreatingConn(false);
    }
  }

  async function handleCreate(): Promise<void> {
    if (!title.trim()) return;
    setIsCreating(true);
    try {
      const res = await fetch("/api/dashboards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          dataSourceId: selectedSourceId,
        }),
      });
      if (res.ok) {
        const json = (await res.json()) as { dashboard: { id: string } };
        setOpen(false);
        reset();
        router.push(`/dashboards/${json.dashboard.id}`);
      }
    } finally {
      setIsCreating(false);
    }
  }

  if (!mounted) {
    return <>{children}</>;
  }

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
            {step === 1 ? "Create Dashboard" : "Select Data Source"}
          </DialogTitle>
        </DialogHeader>

        {step === 1 ? (
          <div className="space-y-4 pt-2">
            <Input
              placeholder="Dashboard title..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleNext();
              }}
              autoFocus
            />
            <Button onClick={handleNext} className="w-full" disabled={!title.trim()}>
              Next
            </Button>
          </div>
        ) : (
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

                {dataSources.length === 0 && !showNewConnection && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No data sources yet. Connect a database below.
                  </p>
                )}
              </div>
            )}

            {!showNewConnection ? (
              <Button
                variant="outline"
                className="w-full gap-2"
                onClick={() => setShowNewConnection(true)}
              >
                <Plus className="size-4" />
                Connect new database
              </Button>
            ) : (
              <Card className="p-4 space-y-3">
                <h4 className="text-sm font-medium">New Connection</h4>
                <Input
                  placeholder="Connection name"
                  value={newConnName}
                  onChange={(e) => setNewConnName(e.target.value)}
                />
                <Input
                  placeholder="postgresql://user:pass@host:5432/dbname"
                  value={newConnUri}
                  onChange={(e) => setNewConnUri(e.target.value)}
                />
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowNewConnection(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    disabled={isCreatingConn || !newConnName.trim() || !newConnUri.trim()}
                    onClick={() => void handleCreateConnection()}
                  >
                    {isCreatingConn ? "Connecting..." : "Connect"}
                  </Button>
                </div>
              </Card>
            )}

            <Button
              onClick={() => void handleCreate()}
              className="w-full"
              disabled={isCreating}
            >
              {isCreating ? "Creating..." : "Create Dashboard"}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
