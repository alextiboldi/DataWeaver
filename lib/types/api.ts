import { z } from "zod";

// Chat API
export const chatRequestSchema = z.object({
  conversationId: z.string().optional(),
  message: z.string().min(1),
  dataSourceId: z.string(),
});
export type ChatRequest = z.infer<typeof chatRequestSchema>;

// Query API
export const queryRequestSchema = z.object({
  dataSourceId: z.string(),
  sql: z.string().min(1),
});
export type QueryRequest = z.infer<typeof queryRequestSchema>;

export interface QueryColumn {
  name: string;
  type: string;
}

export interface QueryResponse {
  columns: QueryColumn[];
  rows: Record<string, unknown>[];
  rowCount: number;
  executionMs: number;
}

// Connections API
export const createConnectionSchema = z.object({
  name: z.string().min(1),
  type: z.string().min(1),
  connectionParams: z.record(z.string(), z.unknown()).optional(),
  connectionUri: z.string().optional(),
});
export type CreateConnectionRequest = z.infer<typeof createConnectionSchema>;

export const testConnectionSchema = z.object({
  type: z.string().min(1),
  connectionParams: z.record(z.string(), z.unknown()).optional(),
});
export type TestConnectionRequest = z.infer<typeof testConnectionSchema>;

export interface ConnectionTestResult {
  success: boolean;
  error?: string;
}

// Semantic API
export interface SemanticModelResponse {
  id: string;
  dataSourceId: string;
  tables: TableMeta[];
  relationships: JoinPath[];
  metrics: MetricDefinitionResponse[];
}

export interface TableMeta {
  name: string;
  displayName: string;
  description: string;
  columns: ColumnMeta[];
}

export interface ColumnMeta {
  name: string;
  displayName: string;
  description: string;
  type: string;
  isPrimaryKey: boolean;
  isForeignKey: boolean;
  referencesTable?: string;
  referencesColumn?: string;
}

export interface JoinPath {
  fromTable: string;
  fromColumn: string;
  toTable: string;
  toColumn: string;
  joinType: "inner" | "left" | "right";
}

export interface MetricDefinitionResponse {
  id: string;
  name: string;
  displayName: string;
  description: string;
  sqlExpression: string;
}

export interface DiscoveryResponse {
  model: SemanticModelResponse;
  tablesFound: number;
  columnsFound: number;
}

// ERD Layout
export interface ErdLayoutEntry {
  x: number;
  y: number;
  w: number;
  h: number;
}

export type ErdLayout = Record<string, ErdLayoutEntry>;

export const erdLayoutEntrySchema = z.object({
  x: z.number(),
  y: z.number(),
  w: z.number(),
  h: z.number(),
});

export const updateErdLayoutSchema = z.object({
  layout: z.record(z.string(), erdLayoutEntrySchema),
});

// Catalog API
export const discoverCatalogSchema = z.object({
  dataSourceId: z.string().min(1),
});
export type DiscoverCatalogRequest = z.infer<typeof discoverCatalogSchema>;

export const updateDatabaseDocSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
});
export type UpdateDatabaseDocRequest = z.infer<typeof updateDatabaseDocSchema>;

export const updateTableDocSchema = z.object({
  displayName: z.string().min(1).optional(),
  description: z.string().optional(),
  tags: z.array(z.string()).optional(),
});
export type UpdateTableDocRequest = z.infer<typeof updateTableDocSchema>;

export const updateColumnDocSchema = z.object({
  displayName: z.string().min(1).optional(),
  description: z.string().optional(),
});
export type UpdateColumnDocRequest = z.infer<typeof updateColumnDocSchema>;
