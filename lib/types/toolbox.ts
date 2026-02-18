export interface ToolboxParameter {
  name: string;
  type: string;
  description: string;
}

export interface ToolboxTool {
  name: string;
  description: string;
  parameters?: ToolboxParameter[];
}

export interface ToolboxToolset {
  name: string;
  tools: ToolboxTool[];
}

export interface SchemaColumn {
  columnName: string;
  dataType: string;
  isNullable: boolean;
  columnDefault: string | null;
  foreignKey: { table: string; column: string } | null;
}

export interface SchemaTable {
  tableName: string;
  columns: SchemaColumn[];
}

export interface SchemaInfo {
  tables: SchemaTable[];
}

export interface ToolboxToolResult {
  rows: Record<string, unknown>[];
}

export interface ToolboxRawResponse {
  result: string;
}
