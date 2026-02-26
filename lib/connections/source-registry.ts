export interface SourceFieldDef {
  name: string;
  label: string;
  type: "text" | "number" | "password" | "select";
  placeholder?: string;
  defaultValue?: string | number;
  required: boolean;
  options?: { label: string; value: string }[];
  helpText?: string;
}

export interface SourceTypeDef {
  id: string;
  displayName: string;
  description: string;
  toolboxSourceKind: string;
  toolboxToolKind: string;
  fields: SourceFieldDef[];
  defaultPort?: number;
  testStrategy: "pg-direct" | "tcp-check" | "file-check" | "toolbox-ping";
  batch: 1 | 2 | 3;
  buildConnectionUri?: (params: Record<string, unknown>) => string | null;
  introspectionQueries: {
    listTables: string;
    describeTable: string;
    getForeignKeys: string;
  };
}

const POSTGRESQL_FIELDS: SourceFieldDef[] = [
  {
    name: "host",
    label: "Host",
    type: "text",
    placeholder: "localhost",
    defaultValue: "localhost",
    required: true,
  },
  {
    name: "port",
    label: "Port",
    type: "number",
    placeholder: "5432",
    defaultValue: 5432,
    required: true,
  },
  {
    name: "database",
    label: "Database",
    type: "text",
    placeholder: "mydb",
    required: true,
  },
  {
    name: "user",
    label: "Username",
    type: "text",
    placeholder: "postgres",
    required: true,
  },
  {
    name: "password",
    label: "Password",
    type: "password",
    placeholder: "••••••••",
    required: true,
  },
];

const MYSQL_FIELDS: SourceFieldDef[] = [
  {
    name: "host",
    label: "Host",
    type: "text",
    placeholder: "localhost",
    defaultValue: "localhost",
    required: true,
  },
  {
    name: "port",
    label: "Port",
    type: "number",
    placeholder: "3306",
    defaultValue: 3306,
    required: true,
  },
  {
    name: "database",
    label: "Database",
    type: "text",
    placeholder: "mydb",
    required: true,
  },
  {
    name: "user",
    label: "Username",
    type: "text",
    placeholder: "root",
    required: true,
  },
  {
    name: "password",
    label: "Password",
    type: "password",
    placeholder: "••••••••",
    required: true,
  },
];

const MSSQL_FIELDS: SourceFieldDef[] = [
  {
    name: "host",
    label: "Host",
    type: "text",
    placeholder: "localhost",
    defaultValue: "localhost",
    required: true,
  },
  {
    name: "port",
    label: "Port",
    type: "number",
    placeholder: "1433",
    defaultValue: 1433,
    required: true,
  },
  {
    name: "database",
    label: "Database",
    type: "text",
    placeholder: "mydb",
    required: true,
  },
  {
    name: "user",
    label: "Username",
    type: "text",
    placeholder: "sa",
    required: true,
  },
  {
    name: "password",
    label: "Password",
    type: "password",
    placeholder: "••••••••",
    required: true,
  },
];

const SQLITE_FIELDS: SourceFieldDef[] = [
  {
    name: "filepath",
    label: "File Path",
    type: "text",
    placeholder: "/path/to/database.db",
    required: true,
    helpText: "Absolute path to the SQLite database file",
  },
];

const BIGQUERY_FIELDS: SourceFieldDef[] = [
  {
    name: "project",
    label: "Project ID",
    type: "text",
    placeholder: "my-gcp-project",
    required: true,
  },
  {
    name: "dataset",
    label: "Dataset",
    type: "text",
    placeholder: "my_dataset",
    required: true,
  },
  {
    name: "credentials_file",
    label: "Credentials File",
    type: "text",
    placeholder: "/path/to/service-account.json",
    required: true,
    helpText: "Path to GCP service account JSON key file",
  },
];

export const SOURCE_TYPES: Record<string, SourceTypeDef> = {
  postgresql: {
    id: "postgresql",
    displayName: "PostgreSQL",
    description: "Open-source relational database",
    toolboxSourceKind: "postgres",
    toolboxToolKind: "postgres-sql",
    fields: POSTGRESQL_FIELDS,
    defaultPort: 5432,
    testStrategy: "pg-direct",
    batch: 1,
    buildConnectionUri: (params) => {
      const { host, port, database, user, password } = params;
      if (!host || !database || !user) return null;
      return `postgresql://${encodeURIComponent(String(user))}:${encodeURIComponent(String(password ?? ""))}@${host}:${port ?? 5432}/${database}`;
    },
    introspectionQueries: {
      listTables:
        "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;",
      describeTable:
        "SELECT column_name, data_type, is_nullable, column_default FROM information_schema.columns WHERE table_schema = 'public' AND table_name = $1 ORDER BY ordinal_position;",
      getForeignKeys: `SELECT
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu ON tc.constraint_name = kcu.constraint_name
      JOIN information_schema.constraint_column_usage AS ccu ON ccu.constraint_name = tc.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_name = $1;`,
    },
  },

  mysql: {
    id: "mysql",
    displayName: "MySQL",
    description: "Popular open-source relational database",
    toolboxSourceKind: "mysql",
    toolboxToolKind: "mysql-sql",
    fields: MYSQL_FIELDS,
    defaultPort: 3306,
    testStrategy: "tcp-check",
    batch: 1,
    buildConnectionUri: (params) => {
      const { host, port, database, user, password } = params;
      if (!host || !database || !user) return null;
      return `mysql://${encodeURIComponent(String(user))}:${encodeURIComponent(String(password ?? ""))}@${host}:${port ?? 3306}/${database}`;
    },
    introspectionQueries: {
      listTables:
        "SELECT table_name FROM information_schema.tables WHERE table_schema = DATABASE() ORDER BY table_name;",
      describeTable:
        "SELECT column_name, data_type, is_nullable, column_default FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = ? ORDER BY ordinal_position;",
      getForeignKeys: `SELECT
        kcu.column_name,
        kcu.referenced_table_name AS foreign_table_name,
        kcu.referenced_column_name AS foreign_column_name
      FROM information_schema.key_column_usage AS kcu
      WHERE kcu.table_schema = DATABASE()
        AND kcu.referenced_table_name IS NOT NULL
        AND kcu.table_name = ?;`,
    },
  },

  mssql: {
    id: "mssql",
    displayName: "SQL Server",
    description: "Microsoft SQL Server",
    toolboxSourceKind: "mssql",
    toolboxToolKind: "mssql-sql",
    fields: MSSQL_FIELDS,
    defaultPort: 1433,
    testStrategy: "tcp-check",
    batch: 1,
    buildConnectionUri: (params) => {
      const { host, port, database, user, password } = params;
      if (!host || !database || !user) return null;
      return `sqlserver://${host}:${port ?? 1433};database=${database};user=${user};password=${password ?? ""};`;
    },
    introspectionQueries: {
      listTables:
        "SELECT TABLE_NAME AS table_name FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE = 'BASE TABLE' ORDER BY TABLE_NAME;",
      describeTable:
        "SELECT COLUMN_NAME AS column_name, DATA_TYPE AS data_type, IS_NULLABLE AS is_nullable, COLUMN_DEFAULT AS column_default FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = @table_name ORDER BY ORDINAL_POSITION;",
      getForeignKeys: `SELECT
        cu.COLUMN_NAME AS column_name,
        pk.TABLE_NAME AS foreign_table_name,
        pt.COLUMN_NAME AS foreign_column_name
      FROM INFORMATION_SCHEMA.REFERENTIAL_CONSTRAINTS AS rc
      JOIN INFORMATION_SCHEMA.CONSTRAINT_COLUMN_USAGE AS cu ON rc.CONSTRAINT_NAME = cu.CONSTRAINT_NAME
      JOIN INFORMATION_SCHEMA.TABLE_CONSTRAINTS AS pk ON rc.UNIQUE_CONSTRAINT_NAME = pk.CONSTRAINT_NAME
      JOIN INFORMATION_SCHEMA.KEY_COLUMN_USAGE AS pt ON pk.CONSTRAINT_NAME = pt.CONSTRAINT_NAME
      WHERE cu.TABLE_NAME = @table_name;`,
    },
  },

  sqlite: {
    id: "sqlite",
    displayName: "SQLite",
    description: "Lightweight file-based database",
    toolboxSourceKind: "sqlite",
    toolboxToolKind: "sqlite-sql",
    fields: SQLITE_FIELDS,
    testStrategy: "file-check",
    batch: 1,
    introspectionQueries: {
      listTables:
        "SELECT name AS table_name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name;",
      describeTable: "PRAGMA table_info({{table_name}});",
      getForeignKeys: "PRAGMA foreign_key_list({{table_name}});",
    },
  },

  bigquery: {
    id: "bigquery",
    displayName: "BigQuery",
    description: "Google Cloud data warehouse",
    toolboxSourceKind: "bigquery",
    toolboxToolKind: "bigquery-sql",
    fields: BIGQUERY_FIELDS,
    testStrategy: "toolbox-ping",
    batch: 1,
    introspectionQueries: {
      listTables:
        "SELECT table_name FROM `{{project}}.{{dataset}}.INFORMATION_SCHEMA.TABLES` ORDER BY table_name;",
      describeTable:
        "SELECT column_name, data_type, is_nullable, column_default FROM `{{project}}.{{dataset}}.INFORMATION_SCHEMA.COLUMNS` WHERE table_name = @table_name ORDER BY ordinal_position;",
      getForeignKeys:
        "SELECT '' AS column_name, '' AS foreign_table_name, '' AS foreign_column_name WHERE FALSE;",
    },
  },

  // Batch 2 — Coming soon
  cloudsql_postgres: {
    id: "cloudsql_postgres",
    displayName: "Cloud SQL (PostgreSQL)",
    description: "Google Cloud SQL for PostgreSQL",
    toolboxSourceKind: "cloud-sql-postgres",
    toolboxToolKind: "postgres-sql",
    fields: [],
    testStrategy: "toolbox-ping",
    batch: 2,
    introspectionQueries: {
      listTables: "",
      describeTable: "",
      getForeignKeys: "",
    },
  },
  cloudsql_mysql: {
    id: "cloudsql_mysql",
    displayName: "Cloud SQL (MySQL)",
    description: "Google Cloud SQL for MySQL",
    toolboxSourceKind: "cloud-sql-mysql",
    toolboxToolKind: "mysql-sql",
    fields: [],
    testStrategy: "toolbox-ping",
    batch: 2,
    introspectionQueries: {
      listTables: "",
      describeTable: "",
      getForeignKeys: "",
    },
  },
  alloydb: {
    id: "alloydb",
    displayName: "AlloyDB",
    description: "Google AlloyDB for PostgreSQL",
    toolboxSourceKind: "alloydb",
    toolboxToolKind: "postgres-sql",
    fields: [],
    testStrategy: "toolbox-ping",
    batch: 2,
    introspectionQueries: {
      listTables: "",
      describeTable: "",
      getForeignKeys: "",
    },
  },
  spanner: {
    id: "spanner",
    displayName: "Spanner",
    description: "Google Cloud Spanner",
    toolboxSourceKind: "spanner",
    toolboxToolKind: "spanner-sql",
    fields: [],
    testStrategy: "toolbox-ping",
    batch: 2,
    introspectionQueries: {
      listTables: "",
      describeTable: "",
      getForeignKeys: "",
    },
  },
  neo4j: {
    id: "neo4j",
    displayName: "Neo4j",
    description: "Graph database",
    toolboxSourceKind: "neo4j",
    toolboxToolKind: "cypher",
    fields: [],
    testStrategy: "toolbox-ping",
    batch: 2,
    introspectionQueries: {
      listTables: "",
      describeTable: "",
      getForeignKeys: "",
    },
  },
};

export const BATCH_1_TYPES = Object.values(SOURCE_TYPES).filter(
  (t) => t.batch === 1
);
export const ALL_TYPES = Object.values(SOURCE_TYPES);

export function getSourceType(id: string): SourceTypeDef | undefined {
  return SOURCE_TYPES[id];
}

export function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function generateToolboxId(name: string): string {
  const slug = slugify(name);
  const short = Math.random().toString(36).substring(2, 8);
  return `source-${slug}-${short}`;
}
