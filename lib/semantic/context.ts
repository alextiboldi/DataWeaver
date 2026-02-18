import type {
  TableMeta,
  JoinPath,
  MetricDefinitionResponse,
} from "@/lib/types/api";

interface CatalogOverride {
  tableName: string;
  displayName: string;
  description: string | null;
  tags: string[];
  columns: {
    columnName: string;
    displayName: string;
    description: string | null;
  }[];
}

export function buildSemanticContext(
  tables: TableMeta[],
  relationships: JoinPath[],
  metrics: MetricDefinitionResponse[],
  catalogOverrides?: CatalogOverride[],
): string {
  const catalogMap = new Map<string, CatalogOverride>();
  if (catalogOverrides) {
    for (const t of catalogOverrides) {
      catalogMap.set(t.tableName, t);
    }
  }

  let context = "## Business Data Dictionary\n\n";

  for (const table of tables) {
    const cat = catalogMap.get(table.name);
    const displayName = cat?.displayName || table.displayName;
    const description = cat?.description || table.description;
    const tags =
      cat?.tags && cat.tags.length > 0
        ? ` [${cat.tags.join(", ")}]`
        : "";

    context += `### ${displayName} (\`${table.name}\`)${tags}\n`;
    context += `${description}\n\n`;
    context += "| Column | Business Name | Type | Notes |\n";
    context += "|--------|--------------|------|-------|\n";

    const catColMap = new Map<string, CatalogOverride["columns"][number]>();
    if (cat) {
      for (const c of cat.columns) {
        catColMap.set(c.columnName, c);
      }
    }

    for (const col of table.columns) {
      const catCol = catColMap.get(col.name);
      const colDisplayName = catCol?.displayName || col.displayName;
      const notes = col.isForeignKey
        ? `FK → ${col.referencesTable}.${col.referencesColumn}`
        : col.isPrimaryKey
          ? "PK"
          : catCol?.description || "";
      context += `| \`${col.name}\` | ${colDisplayName} | ${col.type} | ${notes} |\n`;
    }
    context += "\n";
  }

  if (relationships.length > 0) {
    context += "## Relationships\n\n";
    for (const rel of relationships) {
      context += `- \`${rel.fromTable}.${rel.fromColumn}\` → \`${rel.toTable}.${rel.toColumn}\` (${rel.joinType} join)\n`;
    }
    context += "\n";
  }

  if (metrics.length > 0) {
    context += "## Business Metrics\n\n";
    for (const metric of metrics) {
      context += `### ${metric.displayName}\n`;
      context += `${metric.description}\n`;
      context += `SQL: \`${metric.sqlExpression}\`\n\n`;
    }
  }

  return context;
}
