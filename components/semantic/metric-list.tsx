"use client";

import * as React from "react";
import { Plus, Trash2, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { MetricDefinitionResponse } from "@/lib/types/api";

interface MetricListProps {
  dataSourceId: string;
  metrics: MetricDefinitionResponse[];
  onUpdate: () => void;
}

export function MetricList({ dataSourceId, metrics, onUpdate }: MetricListProps) {
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [name, setName] = React.useState("");
  const [displayName, setDisplayName] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [sqlExpression, setSqlExpression] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);

  function resetForm() {
    setName("");
    setDisplayName("");
    setDescription("");
    setSqlExpression("");
  }

  async function handleCreate() {
    if (!name.trim() || !displayName.trim() || !sqlExpression.trim()) return;
    setSubmitting(true);
    try {
      await fetch(`/api/semantic/${dataSourceId}/metrics`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          displayName: displayName.trim(),
          description: description.trim(),
          sqlExpression: sqlExpression.trim(),
        }),
      });
      resetForm();
      setDialogOpen(false);
      onUpdate();
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(metricId: string) {
    await fetch(`/api/semantic/${dataSourceId}/metrics/${metricId}`, {
      method: "DELETE",
    });
    onUpdate();
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="size-4" />
              Add Metric
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Metric</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <Input
                placeholder="name (e.g. total_revenue)"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="font-mono"
              />
              <Input
                placeholder="Display Name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
              />
              <Textarea
                placeholder="Description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
              />
              <Textarea
                placeholder="SQL Expression (e.g. SUM(orders.total))"
                value={sqlExpression}
                onChange={(e) => setSqlExpression(e.target.value)}
                rows={3}
                className="font-mono text-sm"
              />
              <Button
                onClick={() => void handleCreate()}
                className="w-full"
                disabled={submitting || !name.trim() || !displayName.trim() || !sqlExpression.trim()}
              >
                {submitting ? "Creating..." : "Create Metric"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {metrics.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Activity className="mb-4 size-12 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              No metrics defined yet. Add one to get started.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {metrics.map((metric) => (
            <Card key={metric.id} className="group relative">
              <CardHeader>
                <CardTitle className="text-base">{metric.displayName}</CardTitle>
                <CardDescription className="font-mono text-xs">
                  {metric.name}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {metric.description && (
                  <p className="text-xs text-muted-foreground">{metric.description}</p>
                )}
                <pre className="bg-neutral-100 border-2 border-black p-2 text-xs font-mono overflow-x-auto">
                  {metric.sqlExpression}
                </pre>
              </CardContent>
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity size-7"
                onClick={() => void handleDelete(metric.id)}
              >
                <Trash2 className="size-3" />
              </Button>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
