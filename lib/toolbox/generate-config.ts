import prisma from "@/lib/db";
import { getSourceType } from "@/lib/connections/source-registry";
import { writeFile } from "fs/promises";
import { join } from "path";

export const TOOLBOX_CONFIG_PATH =
  process.env.TOOLBOX_CONFIG_PATH ??
  join(process.cwd(), "tooling", "toolbox-server", "tools.yaml");

/* ---------------------------------------------------------------------------
 * YAML helpers (manual string building -- no external yaml library)
 * -------------------------------------------------------------------------*/

/** Escape a YAML string value, wrapping in double quotes if needed. */
function yamlValue(val: unknown): string {
  const s = String(val ?? "");
  if (
    s === "" ||
    s.includes(":") ||
    s.includes("#") ||
    s.includes("'") ||
    s.includes('"') ||
    s.includes("\n") ||
    s.includes("{") ||
    s.includes("}") ||
    s.includes("[") ||
    s.includes("]") ||
    s.includes(",") ||
    s.includes("@") ||
    s.includes("$") ||
    /^\s|\s$/.test(s)
  ) {
    return `"${s.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
  }
  return s;
}

/** Indent every line of a multi-line string by `n` spaces. */
function indent(text: string, n: number): string {
  const pad = " ".repeat(n);
  return text
    .split("\n")
    .map((line) => (line.trim() === "" ? "" : pad + line))
    .join("\n");
}

/* ---------------------------------------------------------------------------
 * Source-specific YAML block builders
 * -------------------------------------------------------------------------*/

type ConnectionParams = Record<string, unknown>;

function buildSourceBlock(
  toolboxId: string,
  toolboxSourceKind: string,
  params: ConnectionParams
): string {
  const lines: string[] = [];

  lines.push(`${toolboxId}:`);
  lines.push(`  kind: ${yamlValue(toolboxSourceKind)}`);

  switch (toolboxSourceKind) {
    case "postgres":
    case "mysql":
    case "mssql":
      lines.push(`  host: ${yamlValue(params.host)}`);
      lines.push(`  port: ${params.port ?? ""}`);
      lines.push(`  database: ${yamlValue(params.database)}`);
      lines.push(`  user: ${yamlValue(params.user)}`);
      lines.push(`  password: ${yamlValue(params.password)}`);
      break;
    case "sqlite":
      lines.push(`  filepath: ${yamlValue(params.filepath)}`);
      break;
    case "bigquery":
      lines.push(`  project: ${yamlValue(params.project)}`);
      lines.push(`  dataset: ${yamlValue(params.dataset)}`);
      lines.push(`  credentials_file: ${yamlValue(params.credentials_file)}`);
      break;
    default:
      // For unknown kinds, dump all params as-is
      for (const [key, val] of Object.entries(params)) {
        lines.push(`  ${key}: ${yamlValue(val)}`);
      }
  }

  return lines.join("\n");
}

/* ---------------------------------------------------------------------------
 * Tool YAML block builders
 * -------------------------------------------------------------------------*/

function buildExecuteSqlTool(
  toolboxId: string,
  toolboxToolKind: string,
  displayName: string
): string {
  return [
    `${toolboxId}-execute-sql:`,
    `  kind: ${toolboxToolKind}`,
    `  source: ${toolboxId}`,
    `  description: ${yamlValue(`Execute a read-only SQL query against ${displayName}`)}`,
    `  statement: "{{.sql}}"`,
    `  templateParameters:`,
    `    - name: sql`,
    `      type: string`,
    `      description: "The SQL query to execute"`,
  ].join("\n");
}

function buildListTablesTool(
  toolboxId: string,
  toolboxToolKind: string,
  statement: string
): string {
  return [
    `${toolboxId}-list-tables:`,
    `  kind: ${toolboxToolKind}`,
    `  source: ${toolboxId}`,
    `  description: "List all tables in the database"`,
    `  statement: ${yamlValue(statement)}`,
  ].join("\n");
}

function needsTableNameParam(statement: string): boolean {
  return (
    statement.includes("$1") ||
    statement.includes("?") ||
    statement.includes("@table_name")
  );
}

function buildParameterizedTool(
  toolboxId: string,
  toolboxToolKind: string,
  toolSuffix: string,
  description: string,
  statement: string
): string {
  const lines: string[] = [
    `${toolboxId}-${toolSuffix}:`,
    `  kind: ${toolboxToolKind}`,
    `  source: ${toolboxId}`,
    `  description: ${yamlValue(description)}`,
  ];

  // For multi-line statements use YAML block scalar
  if (statement.includes("\n")) {
    lines.push(`  statement: >`);
    lines.push(indent(statement.trim(), 4));
  } else {
    lines.push(`  statement: ${yamlValue(statement)}`);
  }

  if (needsTableNameParam(statement)) {
    lines.push(`  parameters:`);
    lines.push(`    - name: table_name`);
    lines.push(`      type: string`);
    lines.push(`      description: "The name of the table"`);
  }

  return lines.join("\n");
}

/* ---------------------------------------------------------------------------
 * Main generator
 * -------------------------------------------------------------------------*/

export async function writeToolboxConfig(): Promise<void> {
  const dataSources = await prisma.dataSource.findMany({
    where: { status: "connected" },
  });

  const sourceBlocks: string[] = [];
  const toolBlocks: string[] = [];
  const toolsetBlocks: string[] = [];

  for (const ds of dataSources) {
    const sourceType = getSourceType(ds.type);
    if (!sourceType) {
      console.warn(
        `[generate-config] Unknown source type "${ds.type}" for DataSource "${ds.name}" — skipping`
      );
      continue;
    }

    const params = (ds.connectionParams as ConnectionParams) ?? {};

    // --- source ---
    sourceBlocks.push(
      buildSourceBlock(ds.toolboxId, sourceType.toolboxSourceKind, params)
    );

    // --- tools ---
    toolBlocks.push(
      buildExecuteSqlTool(
        ds.toolboxId,
        sourceType.toolboxToolKind,
        sourceType.displayName
      )
    );

    toolBlocks.push(
      buildListTablesTool(
        ds.toolboxId,
        sourceType.toolboxToolKind,
        sourceType.introspectionQueries.listTables
      )
    );

    toolBlocks.push(
      buildParameterizedTool(
        ds.toolboxId,
        sourceType.toolboxToolKind,
        "describe-table",
        "Describe the columns of a specific table",
        sourceType.introspectionQueries.describeTable
      )
    );

    toolBlocks.push(
      buildParameterizedTool(
        ds.toolboxId,
        sourceType.toolboxToolKind,
        "get-foreign-keys",
        "Get foreign key relationships for a table",
        sourceType.introspectionQueries.getForeignKeys
      )
    );

    // --- toolset ---
    toolsetBlocks.push(
      [
        `${ds.toolboxId}-toolset:`,
        `  - ${ds.toolboxId}-execute-sql`,
        `  - ${ds.toolboxId}-list-tables`,
        `  - ${ds.toolboxId}-describe-table`,
        `  - ${ds.toolboxId}-get-foreign-keys`,
      ].join("\n")
    );
  }

  // Assemble full YAML
  const sections: string[] = [];

  sections.push("sources:");
  if (sourceBlocks.length > 0) {
    sections.push(indent(sourceBlocks.join("\n\n"), 2));
  }

  sections.push("");
  sections.push("tools:");
  if (toolBlocks.length > 0) {
    sections.push(indent(toolBlocks.join("\n\n"), 2));
  }

  sections.push("");
  sections.push("toolsets:");
  if (toolsetBlocks.length > 0) {
    sections.push(indent(toolsetBlocks.join("\n\n"), 2));
  }

  const yaml = sections.join("\n") + "\n";

  await writeFile(TOOLBOX_CONFIG_PATH, yaml, "utf-8");
}
