interface MappingInput {
  name: string;
  sourceQuery: string;
  destTable: string;
  columnMappings: Record<string, string>;
  conflictStrategy: string;
  orderIndex: number;
}

interface GenerateOptions {
  pipelineName: string;
  sourceConnectionUri?: string;
  destConnectionUri?: string;
}

function maskUri(uri: string): string {
  try {
    const parsed = new URL(uri);
    if (parsed.password) {
      parsed.password = "****";
    }
    return parsed.toString();
  } catch {
    return "***masked***";
  }
}

export function generateExportSql(
  mappings: MappingInput[],
  options: GenerateOptions
): string {
  const sorted = [...mappings].sort((a, b) => a.orderIndex - b.orderIndex);
  const lines: string[] = [];

  // Header comments
  lines.push(`-- ETL Pipeline: ${options.pipelineName}`);
  lines.push(`-- Generated: ${new Date().toISOString()}`);
  if (options.sourceConnectionUri) {
    lines.push(`-- Source: ${maskUri(options.sourceConnectionUri)}`);
  }
  if (options.destConnectionUri) {
    lines.push(`-- Destination: ${maskUri(options.destConnectionUri)}`);
  }
  lines.push("");

  for (const mapping of sorted) {
    const destCols = Object.values(mapping.columnMappings);
    const destColsList = destCols.map((c) => `"${c}"`).join(", ");

    lines.push(`-- Mapping: ${mapping.name}`);

    switch (mapping.conflictStrategy) {
      case "replace": {
        lines.push(`DELETE FROM "${mapping.destTable}";`);
        lines.push(
          `INSERT INTO "${mapping.destTable}" (${destColsList}) ${mapping.sourceQuery};`
        );
        break;
      }
      case "upsert": {
        const firstCol = destCols[0];
        const updateSets = destCols
          .slice(1)
          .map((c) => `"${c}" = EXCLUDED."${c}"`)
          .join(", ");
        const onConflict = updateSets
          ? `ON CONFLICT ("${firstCol}") DO UPDATE SET ${updateSets}`
          : `ON CONFLICT ("${firstCol}") DO NOTHING`;
        lines.push(
          `INSERT INTO "${mapping.destTable}" (${destColsList}) ${mapping.sourceQuery} ${onConflict};`
        );
        break;
      }
      default: {
        // insert strategy (default)
        lines.push(
          `INSERT INTO "${mapping.destTable}" (${destColsList}) ${mapping.sourceQuery};`
        );
        break;
      }
    }

    lines.push("");
  }

  return lines.join("\n");
}

export function generatePreviewSql(mapping: { sourceQuery: string }): string {
  const trimmed = mapping.sourceQuery.replace(/;\s*$/, "");
  return `${trimmed} LIMIT 100`;
}
