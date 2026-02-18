"use client";

import Link from "next/link";
import { Database } from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";

interface CatalogCardProps {
  id: string;
  name: string;
  description: string | null;
  tableCount: number;
  documentedCount: number;
}

export function CatalogCard({
  id,
  name,
  description,
  tableCount,
  documentedCount,
}: CatalogCardProps) {
  const progress =
    tableCount > 0 ? Math.round((documentedCount / tableCount) * 100) : 0;

  return (
    <Link href={`/catalog/${id}`}>
      <Card className="hover:border-primary/50 transition-colors cursor-pointer">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Database className="size-4 text-muted-foreground" />
            <CardTitle>{name}</CardTitle>
          </div>
          <CardDescription>
            {description || "No description yet"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>
              {tableCount} {tableCount === 1 ? "table" : "tables"}
            </span>
            <span>{progress}% documented</span>
          </div>
          <div className="mt-2 h-1.5 w-full rounded-full bg-muted">
            <div
              className="h-1.5 rounded-full bg-primary transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
