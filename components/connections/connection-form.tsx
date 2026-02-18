"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";

interface ConnectionFormProps {
  onConnectionAdded: () => void;
}

export function ConnectionForm({ onConnectionAdded }: ConnectionFormProps) {
  const router = useRouter();
  const [name, setName] = React.useState("");
  const [connectionUri, setConnectionUri] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const res = await fetch("/api/connections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, type: "postgresql", connectionUri }),
      });

      if (res.ok) {
        const data: { databaseDocId?: string } = await res.json();
        setName("");
        setConnectionUri("");
        onConnectionAdded();
        if (data.databaseDocId) {
          router.push(`/catalog/${data.databaseDocId}`);
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="p-4">
      <h3 className="font-medium mb-3">Add Connection</h3>
      <form onSubmit={handleSubmit} className="space-y-3">
        <Input
          placeholder="Connection name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        <Input
          placeholder="postgresql://user:pass@host:5432/dbname"
          value={connectionUri}
          onChange={(e) => setConnectionUri(e.target.value)}
          required
        />
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Testing..." : "Add Connection"}
        </Button>
      </form>
    </Card>
  );
}
