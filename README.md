# DataWeaver

DataWeaver is a data exploration and AI-assisted analytics platform. It connects to PostgreSQL databases, lets users ask questions in plain English, and renders rich visualizations -- charts, tables, metric cards, and composed dashboards -- all from a single conversational interface. It also provides a data catalog with AI-generated documentation, a semantic modeling layer, and drag-and-drop dashboards.

## Key Features

- **Natural-Language-to-SQL Chat** -- Ask questions about your data in plain English; an AI agent writes, validates, and executes read-only SQL, then renders interactive results.
- **Rich Visualization Rendering** -- Query results are automatically classified and rendered as bar, line, area, pie, or scatter charts, or as data tables. Multi-component dashboards are composed via a JSON-render spec.
- **Data Catalog with AI Documentation** -- Connect a database and DataWeaver introspects every table and column, then uses Google Gemini to generate business-friendly descriptions, display names, and tags.
- **Semantic Layer** -- Define business-friendly table names, column descriptions, join paths, and reusable metric definitions (SQL expressions) that feed context into the AI chat agent.
- **Drag-and-Drop Dashboards** -- Create dashboards with panels backed by live SQL queries, rearrange them with react-grid-layout, and choose chart types per panel.
- **Database Connections** -- Register PostgreSQL connection URIs; DataWeaver tests the connection, discovers the schema, and syncs it into the catalog automatically.
- **Authentication** -- GitHub OAuth and email/password credentials via NextAuth v5 (JWT strategy). Middleware protects all app routes.

---

## Table of Contents

- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Getting Started](#getting-started)
  - [1. Clone the Repository](#1-clone-the-repository)
  - [2. Install Dependencies](#2-install-dependencies)
  - [3. Start Infrastructure](#3-start-infrastructure)
  - [4. Configure Environment Variables](#4-configure-environment-variables)
  - [5. Initialize the Database](#5-initialize-the-database)
  - [6. Start the Development Server](#6-start-the-development-server)
- [Architecture](#architecture)
  - [Directory Structure](#directory-structure)
  - [Request Lifecycle](#request-lifecycle)
  - [AI Chat Agent](#ai-chat-agent)
  - [Toolbox Server](#toolbox-server)
  - [Data Catalog](#data-catalog)
  - [Semantic Layer](#semantic-layer)
  - [Visualization Pipeline](#visualization-pipeline)
  - [Dashboard System](#dashboard-system)
  - [Authentication](#authentication)
  - [Database Schema](#database-schema)
- [API Reference](#api-reference)
- [Environment Variables](#environment-variables)
- [Available Scripts](#available-scripts)
- [Styling and Design System](#styling-and-design-system)
- [Deployment](#deployment)
- [Troubleshooting](#troubleshooting)
- [License](#license)

---

## Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| **Framework** | Next.js (App Router) | 16.1 |
| **Language** | TypeScript (strict mode) | 5.x |
| **UI Library** | React | 19.2 |
| **Styling** | Tailwind CSS v4 | 4.x |
| **Component Library** | Shadcn UI (new-york style) | -- |
| **Icons** | Lucide React | 0.574 |
| **Primitives** | Radix UI | 1.4 |
| **Animations** | Framer Motion | 12.x |
| **ORM** | Prisma (with `@prisma/adapter-pg`) | 7.4 |
| **Database** | PostgreSQL | 17 |
| **Auth** | NextAuth v5 (beta) | 5.0.0-beta.30 |
| **AI/LLM** | Vercel AI SDK + Google Gemini 2.5 Flash | 6.x / 3.x |
| **Charts** | Recharts | 3.7 |
| **Data Tables** | TanStack Table | 8.x |
| **Forms** | TanStack Form | 1.x |
| **Data Fetching** | TanStack Query | 5.x |
| **State Management** | Zustand | 5.x |
| **Node Graph Editor** | XY Flow (`@xyflow/react`) | 12.x |
| **JSON-driven UI** | `@json-render/core` + `@json-render/react` | 0.7 |
| **Drag-and-Drop Layouts** | react-grid-layout | 2.2 |
| **Schema Validation** | Zod | 4.x |
| **Package Manager** | pnpm | -- |
| **Linting** | ESLint 9 flat config | 9.x |

---

## Prerequisites

Before you begin, make sure you have the following installed:

- **Node.js** 20 or higher
- **pnpm** (install via `npm install -g pnpm` or `corepack enable`)
- **Docker** and **Docker Compose** (for PostgreSQL and the toolbox server)
- **A Google Cloud API key** with the Generative AI API enabled (for AI chat and AI documentation features)
- **GitHub OAuth app credentials** (optional, for GitHub login)

---

## Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/your-username/DataWeaver.git
cd DataWeaver
```

### 2. Install Dependencies

```bash
pnpm install
```

This installs all Node.js dependencies and builds the Prisma engine binaries.

### 3. Start Infrastructure

DataWeaver requires three Docker services:

| Service | Port | Purpose |
|---------|------|---------|
| `dataweaver-db` | 5432 | Application database (stores users, connections, dashboards, catalog, etc.) |
| `pg-sample-db` | 5433 | Sample database with customers, products, and orders data for demo/testing |
| `toolbox` | 5050 | Google Database Toolbox server that proxies SQL queries to the sample database |

Start all three:

```bash
docker compose up -d
```

Verify they are running:

```bash
docker compose ps
```

You should see all three services listed as healthy/running. The sample database is automatically seeded with 10 customers, 10 products, and 500 randomized orders via `tooling/sample-db/init.sql`.

### 4. Configure Environment Variables

Create a `.env` file in the project root:

```bash
cp .env.example .env   # if an example file exists, otherwise create manually
```

Add the following variables:

```env
# Application database
DATABASE_URL=postgresql://dataweaver:dataweaverpass@localhost:5432/dataweaver

# NextAuth
AUTH_SECRET=your-random-secret-here
AUTH_URL=http://localhost:3000

# GitHub OAuth (optional -- needed only for GitHub login)
GITHUB_ID=your-github-oauth-client-id
GITHUB_SECRET=your-github-oauth-client-secret

# Google Generative AI (required for chat and AI documentation)
GOOGLE_GENERATIVE_AI_API_KEY=your-google-api-key

# Toolbox server URL (default works with docker-compose)
TOOLBOX_URL=http://localhost:5050
```

To generate an `AUTH_SECRET`, run:

```bash
openssl rand -base64 32
```

### 5. Initialize the Database

Run the Prisma migration to create all application tables:

```bash
pnpm db:migrate
```

This applies the migration in `prisma/migrations/20260218063637_init/` which creates all tables (User, DataSource, SemanticModel, MetricDefinition, Conversation, Message, Dashboard, DashboardPanel, DatabaseDoc, TableDoc, ColumnDoc).

Optionally, seed the database:

```bash
pnpm db:seed
```

### 6. Start the Development Server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser. You will see the landing page. Click **Get Started** or navigate to `/auth/signup` to create an account with email/password, or sign in with GitHub.

After signing in, you are redirected to the dashboard at `/dashboards`.

---

## Architecture

### Directory Structure

```
DataWeaver/
├── app/                          # Next.js App Router
│   ├── layout.tsx                # Root layout (metadata, global CSS)
│   ├── page.tsx                  # Landing page (brutalist design with Framer Motion)
│   ├── globals.css               # Tailwind v4 imports, CSS variables, markdown styles
│   ├── (app)/                    # Authenticated app route group
│   │   ├── layout.tsx            # App shell: collapsible sidebar + session provider
│   │   ├── page.tsx              # Redirects to /dashboards
│   │   ├── dashboards/           # Dashboard list + individual dashboard view
│   │   │   └── [id]/page.tsx     # Dashboard canvas with drag-and-drop panels
│   │   ├── connections/          # Database connection management
│   │   ├── catalog/              # Data catalog browser
│   │   │   └── [id]/page.tsx     # Database detail with ERD canvas
│   │   ├── semantic/             # Semantic model editor
│   │   │   └── [dataSourceId]/   # Per-datasource semantic model
│   │   ├── chat/                 # AI chat interface
│   │   └── components/           # Component showcase / design system
│   ├── auth/                     # Public auth pages (not behind middleware)
│   │   ├── signin/page.tsx       # Sign-in form
│   │   └── signup/page.tsx       # Sign-up form
│   └── api/                      # API routes
│       ├── auth/                 # NextAuth handlers + signup endpoint
│       ├── catalog/              # Catalog CRUD + discovery + AI documentation
│       ├── chat/                 # AI chat streaming endpoint
│       ├── connections/          # Connection CRUD with auto-discovery
│       ├── dashboards/           # Dashboard + panel CRUD
│       ├── query/                # Direct SQL query execution
│       └── semantic/             # Semantic model + metrics CRUD
├── components/                   # React components
│   ├── auth/                     # UserMenu (session avatar + sign out)
│   ├── catalog/                  # CatalogCard, ERDCanvas (XY Flow), TableDetailSheet, TableNode
│   ├── chat/                     # ChatInput, ChatPanel, MessageList, Message, UIRenderer
│   ├── connections/              # ConnectionForm, ConnectionList
│   ├── dashboard/                # CreateDashboardDialog, DashboardCanvas (react-grid-layout)
│   ├── data/                     # DataTable (TanStack Table), SqlPreview
│   ├── landing/                  # ComponentCarousel (Framer Motion)
│   ├── semantic/                 # MetricList, RelationshipList, TableList
│   ├── ui/                       # Shadcn components (Button, Card, Dialog, Sidebar, etc.)
│   └── viz/                      # ChartCard, ChartRenderer (Recharts)
├── lib/                          # Shared server/client logic
│   ├── agent/                    # AI chat agent
│   │   ├── index.ts              # createAgentStream -- wires model + tools + prompt
│   │   ├── tools.ts              # Agent tools: executeQuery, getSchema, renderUI, compareQueries
│   │   ├── prompts.ts            # System prompt builder (schema + catalog context)
│   │   ├── validation.ts         # SQL validation (read-only enforcement)
│   │   └── formatter.ts          # Query result formatting + column type inference
│   ├── auth/                     # Auth configuration
│   │   ├── config.ts             # Edge-compatible config (GitHub provider, JWT, callbacks)
│   │   └── index.ts              # Full config (adds Credentials provider + DB callbacks)
│   ├── catalog/                  # Data catalog logic
│   │   ├── discover.ts           # discoverAndSync -- introspects DB and syncs to catalog
│   │   ├── direct-introspect.ts  # Direct PostgreSQL introspection via pg driver
│   │   ├── ai-document.ts        # AI-powered documentation (Gemini generates descriptions)
│   │   ├── fingerprint.ts        # SHA-256 fingerprint of connection (host:port/db)
│   │   └── utils.ts              # humanize() -- snake_case to Title Case
│   ├── db/                       # Prisma client singleton
│   │   └── index.ts              # PrismaClient with @prisma/adapter-pg
│   ├── render/                   # JSON-render system for AI-composed UI
│   │   ├── catalog.ts            # Zod-validated component catalog (Stack, Grid, Charts, etc.)
│   │   ├── registry.tsx          # React component registry (maps catalog to Recharts/Shadcn)
│   │   └── showcase-data.ts      # Sample data for the component showcase page
│   ├── semantic/                 # Semantic layer logic
│   │   ├── discovery.ts          # Discover tables + relationships from schema
│   │   └── context.ts            # Build semantic context string for AI prompts
│   ├── toolbox/                  # Toolbox server client
│   │   ├── client.ts             # ToolboxClient -- HTTP client for the toolbox API
│   │   └── introspect.ts         # Schema introspection via toolbox tools
│   ├── types/                    # Shared TypeScript types
│   │   ├── api.ts                # Zod schemas + interfaces for all API contracts
│   │   └── toolbox.ts            # Toolbox-related interfaces (SchemaInfo, etc.)
│   ├── viz/                      # Visualization logic
│   │   └── inference.ts          # Chart type inference from column types + data shape
│   └── utils.ts                  # cn() helper (clsx + tailwind-merge)
├── hooks/                        # Custom React hooks
│   └── use-mobile.ts             # useIsMobile() -- responsive breakpoint detection
├── prisma/                       # Database schema and migrations
│   ├── schema.prisma             # Prisma schema (11 models)
│   └── migrations/               # SQL migrations
├── tooling/                      # Docker toolbox configuration
│   ├── sample-db/init.sql        # Sample database seed (customers, products, orders)
│   └── toolbox-server/tools.yaml # Toolbox tool definitions (execute-sql, list-tables, etc.)
├── generated/prisma/             # Generated Prisma client (gitignored)
├── public/                       # Static assets (SVGs)
├── docker-compose.yml            # PostgreSQL (x2) + Toolbox server
├── prisma.config.ts              # Prisma config (datasource URL from env)
├── middleware.ts                  # NextAuth middleware (protects all routes except auth/landing)
├── next.config.ts                # Next.js config
├── tsconfig.json                 # TypeScript config (strict, bundler resolution, @/* paths)
├── eslint.config.mjs             # ESLint 9 flat config
├── postcss.config.mjs            # PostCSS with @tailwindcss/postcss
├── components.json               # Shadcn UI config (new-york style, RSC enabled)
├── pnpm-workspace.yaml           # pnpm workspace config
└── package.json                  # Scripts, dependencies, version (0.8.4)
```

### Request Lifecycle

A typical request through the application follows this path:

```
Browser
  │
  ├── Landing page (/) ──► Static React page with Framer Motion animations
  │
  ├── Auth pages (/auth/*) ──► NextAuth sign-in/sign-up forms
  │
  └── App routes (/(app)/*) ──► Protected by NextAuth middleware
       │
       ├── Client Component (React 19)
       │     │
       │     ├── TanStack Query ──► fetch() to /api/* routes
       │     │
       │     └── Vercel AI SDK useChat() ──► POST /api/chat (streaming)
       │
       └── API Route (Next.js Route Handler)
             │
             ├── Prisma ORM ──► Application PostgreSQL (port 5432)
             │
             ├── ToolboxClient ──► Toolbox Server (port 5050)
             │                       │
             │                       └──► Sample PostgreSQL (port 5433)
             │
             └── Vercel AI SDK streamText() ──► Google Gemini API
```

### AI Chat Agent

The chat system is the core feature of DataWeaver. It uses the Vercel AI SDK's agentic loop to let users ask data questions in natural language.

**How it works:**

1. The user sends a message via the chat UI (`components/chat/chat-panel.tsx`).
2. The frontend calls `POST /api/chat` using the AI SDK's `useChat()` hook, which streams the response.
3. The API route calls `createAgentStream()` in `lib/agent/index.ts`, which:
   - Introspects the database schema via the Toolbox server (cached after first call).
   - Loads catalog documentation (business-friendly descriptions) from Prisma if a data source is selected.
   - Builds a system prompt (`lib/agent/prompts.ts`) that includes the full schema, catalog context, and detailed instructions for multi-step analysis, comparison queries, and visualization rendering.
   - Calls `streamText()` with Google Gemini 2.5 Flash, a max of 10 tool-call steps, and four tools:

**Agent Tools (defined in `lib/agent/tools.ts`):**

| Tool | Description |
|------|-------------|
| `executeQuery` | Validates SQL is read-only, then executes it via the Toolbox server. Returns formatted columns, rows, row count. |
| `getSchema` | Fetches table list or detailed column info for a specific table from the Toolbox server. |
| `renderUI` | Returns a JSON-render spec for composing multi-component dashboards (metric cards + charts + tables in layouts). |
| `compareQueries` | Executes two queries in parallel for side-by-side comparison (period-over-period, segment analysis). |

**SQL Validation (`lib/agent/validation.ts`):**

All queries pass through validation before execution. The validator:
- Rejects any query containing INSERT, UPDATE, DELETE, DROP, ALTER, TRUNCATE, CREATE, GRANT, REVOKE, EXEC, or SQL comments.
- Requires queries to start with SELECT, WITH (CTE), or EXPLAIN.
- Enforces a maximum query length of 5,000 characters.

**Visualization Rendering:**

The frontend automatically renders `executeQuery` results as interactive charts. The chart type is inferred by `lib/viz/inference.ts` based on column types:

| Column Pattern | Chart Type |
|---------------|------------|
| 1 categorical + 1 numeric (sums to ~100%) | Pie |
| 1 categorical + 1 numeric | Bar |
| 1 date + 1 numeric | Line |
| 1 date + multiple numerics | Area |
| 2 numerics only | Scatter |
| 1 categorical + multiple numerics | Grouped Bar |
| Fallback | Table |

For complex multi-component layouts, the agent uses the `renderUI` tool with a JSON-render spec. The spec is a flat element tree where each element has a type (Stack, Grid, MetricCard, BarChart, etc.), props, and children references. The `lib/render/registry.tsx` maps these to actual React components built on Recharts and Shadcn UI.

### Toolbox Server

The Toolbox server is a sidecar service from Google's Database Toolbox project. It sits between DataWeaver and the sample PostgreSQL database, providing a REST API for executing SQL and introspecting schemas.

**Configuration (`tooling/toolbox-server/tools.yaml`):**

The toolbox exposes four tools:
- `execute-sql` -- Execute arbitrary SQL (used by the AI agent).
- `list-tables` -- List all public tables.
- `describe-table` -- Get columns, types, and nullability for a table.
- `get-foreign-keys` -- Get foreign key relationships for a table.

**Client (`lib/toolbox/client.ts`):**

The `ToolboxClient` class wraps HTTP calls to the toolbox REST API at `http://localhost:5050`. It provides `executeTool(toolName, params)` which POSTs to `/api/tool/{name}/invoke` and parses the JSON result into `{ rows: Record<string, unknown>[] }`.

The toolbox URL defaults to `http://localhost:5050` and can be overridden with the `TOOLBOX_URL` environment variable.

### Data Catalog

The data catalog provides a browsable, documented view of all tables and columns in connected databases.

**Discovery flow:**

1. When a user creates a new connection (`POST /api/connections`), if the connection URI is provided, `discoverAndSync()` is called automatically.
2. `discoverAndSync()` in `lib/catalog/discover.ts`:
   - Computes a SHA-256 fingerprint of the connection (host:port/database) to deduplicate.
   - Calls `introspectDirect()` which connects directly to the database via the `pg` driver and queries `information_schema` for tables, columns, and foreign keys.
   - Upserts a `DatabaseDoc` record, then upserts `TableDoc` and `ColumnDoc` records for every table and column.
   - Column display names are auto-generated from snake_case via `humanize()` (e.g., `order_date` becomes `Order Date`).

3. AI Documentation (`lib/catalog/ai-document.ts`):
   - `aiDocumentTable(tableDocId)` sends the table name, columns, and sibling table names to Google Gemini and asks for business-friendly display names and descriptions.
   - `aiDocumentAll(dbDocId)` iterates over all undocumented tables and documents them one by one.
   - Triggered via `POST /api/catalog/[id]/ai-document` or `POST /api/catalog/[id]/tables/[tableId]/ai-document`.

**ERD Visualization:**

The catalog detail page (`app/(app)/catalog/[id]/page.tsx`) renders an interactive Entity-Relationship Diagram using XY Flow (`@xyflow/react`). Each table is a custom node (`components/catalog/table-node.tsx`) showing columns, types, and foreign key indicators. Tables can be clicked to open a detail sheet (`components/catalog/table-detail-sheet.tsx`) with full column documentation and edit capabilities.

### Semantic Layer

The semantic layer adds business meaning on top of the raw database schema.

**Components:**

- **Tables** -- Business-friendly names and descriptions for database tables.
- **Relationships** (Join Paths) -- Defined joins between tables with join type (inner, left, right).
- **Metrics** -- Reusable metric definitions with SQL expressions (e.g., `SUM(orders.total_amount)` as "Total Revenue").

**Discovery (`lib/semantic/discovery.ts`):**

`discoverSemanticModel()` introspects the schema via the Toolbox server and auto-generates a semantic model with humanized names, detected foreign keys as relationships, and column metadata.

**Context Building (`lib/semantic/context.ts`):**

`buildSemanticContext()` generates a markdown string with a Business Data Dictionary, Relationships section, and Business Metrics section. This context is injected into the AI agent's system prompt to improve query generation accuracy. It also merges catalog overrides (AI-generated descriptions) when available.

**API:**

- `GET /api/semantic/[dataSourceId]` -- Get the semantic model for a data source.
- `POST /api/semantic/[dataSourceId]/discover` -- Auto-discover and create a semantic model.
- `GET/POST /api/semantic/[dataSourceId]/metrics` -- List or create metric definitions.
- `DELETE /api/semantic/[dataSourceId]/metrics/[metricId]` -- Delete a metric.

### Visualization Pipeline

DataWeaver has a layered visualization system:

1. **Automatic inference** (`lib/viz/inference.ts`) -- Classifies query result columns by type (text, numeric, date, boolean) and selects the best chart type.

2. **Chart rendering** (`components/viz/chart-renderer.tsx`) -- Takes a `QueryResponse` and renders the appropriate Recharts component (BarChart, LineChart, AreaChart, PieChart, ScatterChart, or DataTable).

3. **JSON-render system** (`lib/render/`) -- For AI-composed multi-component layouts. The catalog (`lib/render/catalog.ts`) defines available components with Zod schemas. The registry (`lib/render/registry.tsx`) maps component types to React implementations. Available components:
   - **Layout**: Stack (vertical/horizontal), Grid (2-4 columns)
   - **Typography**: Heading (h1-h3), Text
   - **Data Display**: MetricCard, BarChart, LineChart, AreaChart, PieChart, ScatterChart, DataTable

4. **Chat UI renderer** (`components/chat/ui-renderer.tsx`) -- Renders JSON-render specs returned by the agent's `renderUI` tool call.

### Dashboard System

Dashboards provide persistent, customizable views of data.

**Models:**

- `Dashboard` -- Has a title, belongs to a user, and is optionally linked to a data source.
- `DashboardPanel` -- Belongs to a dashboard. Has a chart type, title, SQL query, config JSON, and layout JSON (`{ x, y, w, h }`).

**Canvas (`components/dashboard/dashboard-canvas.tsx`):**

Uses `react-grid-layout` for drag-and-drop panel arrangement. Each panel executes its SQL query via `POST /api/query` and renders the result with the chart renderer. Panel positions are saved back to the API after reorganization.

**API:**

- `GET/POST /api/dashboards` -- List or create dashboards.
- `GET/PUT/DELETE /api/dashboards/[id]` -- Get, update, or delete a dashboard.
- `GET/POST /api/dashboards/[id]/panels` -- List or create panels.
- `GET/PUT/DELETE /api/dashboards/[id]/panels/[panelId]` -- Manage individual panels.

### Authentication

DataWeaver uses NextAuth v5 (beta) with a JWT session strategy.

**Providers:**

- **GitHub OAuth** -- Configured in `lib/auth/config.ts` (edge-compatible). On first GitHub sign-in, a User record is auto-created in the database.
- **Email/Password Credentials** -- Configured in `lib/auth/index.ts` (server-only). Passwords are hashed with bcryptjs. Users register via `POST /api/auth/signup`.

**Middleware (`middleware.ts`):**

The NextAuth middleware runs on all routes except:
- `_next/static`, `_next/image`, `favicon.ico` (static assets)
- `/auth/*` (sign-in/sign-up pages)
- `/api/auth/*` (NextAuth API routes)
- `/` (landing page)

All other routes require authentication. Unauthenticated requests are redirected to `/auth/signin`.

**JWT Callbacks:**

The JWT token includes `userId` and `role` (default: "editor"). These are propagated to the session object for use in server components and API routes.

### Database Schema

The application database has 11 models:

```
User
├── id (cuid, PK)
├── email (unique)
├── name
├── hashedPassword
├── role (default: "editor")
├── createdAt / updatedAt
└── Relations: conversations[], dashboards[], dataSources[]

DataSource
├── id (cuid, PK)
├── name, type ("postgresql", "mysql", "bigquery")
├── host, port, database, connectionUri
├── toolboxId, status (default: "pending")
├── userId → User
├── databaseDocId → DatabaseDoc
└── Relations: semanticModels[], conversations[], dashboards[]

SemanticModel
├── id (cuid, PK)
├── dataSourceId → DataSource
├── version, tables (JSON), relationships (JSON)
└── Relations: metrics[]

MetricDefinition
├── id (cuid, PK)
├── semanticModelId → SemanticModel
├── name, displayName, description, sqlExpression

Conversation
├── id (cuid, PK)
├── title, dataSourceId → DataSource, userId → User
└── Relations: messages[]

Message
├── id (cuid, PK)
├── conversationId → Conversation (cascade delete)
├── role, content, sqlGenerated, sqlResults (JSON), metadata (JSON)

Dashboard
├── id (cuid, PK)
├── title, userId → User, dataSourceId → DataSource
└── Relations: panels[]

DashboardPanel
├── id (cuid, PK)
├── dashboardId → Dashboard (cascade delete)
├── chartType, title, description, sql
├── config (JSON), layout (JSON: {x, y, w, h})

DatabaseDoc
├── id (cuid, PK)
├── fingerprint (unique, SHA-256 of host:port/db)
├── name, description
└── Relations: dataSources[], tables[]

TableDoc
├── id (cuid, PK)
├── databaseDocId → DatabaseDoc (cascade delete)
├── tableName, displayName, description, tags[]
├── Unique: (databaseDocId, tableName)
└── Relations: columns[]

ColumnDoc
├── id (cuid, PK)
├── tableDocId → TableDoc (cascade delete)
├── columnName, displayName, description, dataType
├── nullable, isPrimaryKey, isForeignKey
├── foreignTable, foreignColumn
└── Unique: (tableDocId, columnName)
```

---

## API Reference

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| `*` | `/api/auth/[...nextauth]` | NextAuth.js handler (sign-in, sign-out, session, etc.) |
| `POST` | `/api/auth/signup` | Register a new user with email and password |

### Connections

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/connections` | List all data source connections |
| `POST` | `/api/connections` | Create a new connection (auto-discovers schema and syncs catalog) |

### Catalog

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/catalog` | List all database docs |
| `POST` | `/api/catalog/discover` | Discover and sync catalog for a data source |
| `GET` | `/api/catalog/[id]` | Get a database doc with tables |
| `PUT` | `/api/catalog/[id]` | Update database doc (name, description) |
| `POST` | `/api/catalog/[id]/ai-document` | AI-document all undocumented tables |
| `GET` | `/api/catalog/[id]/tables/[tableId]` | Get a table doc with columns |
| `PUT` | `/api/catalog/[id]/tables/[tableId]` | Update table doc (displayName, description, tags) |
| `POST` | `/api/catalog/[id]/tables/[tableId]/ai-document` | AI-document a single table |
| `PUT` | `/api/catalog/[id]/tables/[tableId]/columns/[columnId]` | Update column doc |

### Chat

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/chat` | Stream an AI chat response (sends `UIMessage[]`, optional `dataSourceId`) |

### Query

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/query` | Execute a validated read-only SQL query via the Toolbox server |

### Dashboards

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/dashboards` | List all dashboards for the current user |
| `POST` | `/api/dashboards` | Create a new dashboard |
| `GET` | `/api/dashboards/[id]` | Get a dashboard with panels |
| `PUT` | `/api/dashboards/[id]` | Update a dashboard |
| `DELETE` | `/api/dashboards/[id]` | Delete a dashboard |
| `GET` | `/api/dashboards/[id]/panels` | List panels for a dashboard |
| `POST` | `/api/dashboards/[id]/panels` | Create a new panel |
| `PUT` | `/api/dashboards/[id]/panels/[panelId]` | Update a panel (SQL, config, layout) |
| `DELETE` | `/api/dashboards/[id]/panels/[panelId]` | Delete a panel |

### Semantic

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/semantic/[dataSourceId]` | Get the semantic model for a data source |
| `POST` | `/api/semantic/[dataSourceId]/discover` | Auto-discover and create a semantic model |
| `GET` | `/api/semantic/[dataSourceId]/metrics` | List metric definitions |
| `POST` | `/api/semantic/[dataSourceId]/metrics` | Create a metric definition |
| `DELETE` | `/api/semantic/[dataSourceId]/metrics/[metricId]` | Delete a metric definition |

---

## Environment Variables

### Required

| Variable | Description | How to Get |
|----------|-------------|------------|
| `DATABASE_URL` | PostgreSQL connection string for the application database | Use the default from docker-compose: `postgresql://dataweaver:dataweaverpass@localhost:5432/dataweaver` |
| `AUTH_SECRET` | Secret key for NextAuth JWT signing | Run `openssl rand -base64 32` |
| `GOOGLE_GENERATIVE_AI_API_KEY` | API key for Google Gemini (powers chat and AI documentation) | [Google AI Studio](https://aistudio.google.com/) |

### Optional

| Variable | Description | Default |
|----------|-------------|---------|
| `AUTH_URL` | Base URL for NextAuth (needed in production) | `http://localhost:3000` |
| `GITHUB_ID` | GitHub OAuth app Client ID | -- |
| `GITHUB_SECRET` | GitHub OAuth app Client Secret | -- |
| `TOOLBOX_URL` | URL of the Database Toolbox server | `http://localhost:5050` |
| `NODE_ENV` | Environment mode | `development` |

### Setting Up GitHub OAuth

1. Go to [GitHub Developer Settings](https://github.com/settings/developers).
2. Click **New OAuth App**.
3. Set the homepage URL to `http://localhost:3000`.
4. Set the callback URL to `http://localhost:3000/api/auth/callback/github`.
5. Copy the Client ID and Client Secret into your `.env`.

---

## Available Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start the Next.js development server at [http://localhost:3000](http://localhost:3000) |
| `pnpm build` | Create a production build |
| `pnpm start` | Start the production server (requires `pnpm build` first) |
| `pnpm lint` | Run ESLint with the flat config |
| `pnpm db:migrate` | Run Prisma migrations in development mode |
| `pnpm db:push` | Push the Prisma schema to the database without creating a migration |
| `pnpm db:studio` | Open Prisma Studio GUI at [http://localhost:5555](http://localhost:5555) |
| `pnpm db:seed` | Seed the application database (runs `prisma/seed.ts` via tsx) |
| `docker compose up -d` | Start PostgreSQL (x2) and the Toolbox server |
| `docker compose down` | Stop all Docker services |
| `docker compose ps` | Check status of Docker services |

---

## Styling and Design System

DataWeaver uses a **brutalist design aesthetic** with a monospace font, sharp corners (0px border-radius), solid black borders, and a monochrome color palette.

**Key design decisions:**

- **Font**: `ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace` -- applied globally via `globals.css`.
- **Border Radius**: All radii are set to `0px` (fully sharp corners) via CSS variables.
- **Color Scheme**: Black and white with neutral grays. No color accents. Chart colors are five shades of gray from `--chart-1` (#000000) through `--chart-5` (#D4D4D4).
- **Tailwind v4**: Uses `@import "tailwindcss"` syntax with `@theme inline` blocks for design tokens. No `tailwind.config.js` file.
- **Shadcn UI**: `new-york` style variant with RSC support. Components live in `components/ui/`.
- **CSS Variables**: All colors are defined as CSS custom properties in `:root` within `globals.css`. Tailwind references them via `--color-*` mappings in the `@theme inline` block.
- **Animations**: Framer Motion is used for the landing page animations and the component carousel. Tailwind animate CSS (`tw-animate-css`) is imported for utility animations.

---

## Deployment

### Vercel (Recommended)

DataWeaver is a Next.js application and deploys naturally to Vercel:

1. Push your repository to GitHub.
2. Import it in [Vercel](https://vercel.com/new).
3. Set the environment variables in the Vercel dashboard:
   - `DATABASE_URL` -- Use a cloud PostgreSQL provider (Neon, Supabase, Railway, etc.)
   - `AUTH_SECRET`
   - `AUTH_URL` -- Your production domain (e.g., `https://dataweaver.vercel.app`)
   - `GOOGLE_GENERATIVE_AI_API_KEY`
   - `GITHUB_ID` / `GITHUB_SECRET` (if using GitHub OAuth)
   - `TOOLBOX_URL` -- You will need to host the Toolbox server separately

4. Vercel will automatically detect the Next.js framework and configure the build.

**Important**: The Toolbox server and sample database are not deployed to Vercel. For production, you need to either:
- Host the Toolbox server on a separate service (Cloud Run, Fly.io, Railway).
- Replace the Toolbox integration with direct database connections.

### Docker

Build and run the application in Docker:

```bash
# Build the image
docker build -t dataweaver .

# Run with environment variables
docker run -p 3000:3000 \
  -e DATABASE_URL=postgresql://... \
  -e AUTH_SECRET=... \
  -e GOOGLE_GENERATIVE_AI_API_KEY=... \
  -e TOOLBOX_URL=http://toolbox:5050 \
  dataweaver
```

Or use docker-compose for the full stack including the application, both databases, and the toolbox server.

### Production Checklist

- [ ] Set `NODE_ENV=production`
- [ ] Use a managed PostgreSQL service with SSL
- [ ] Set `AUTH_URL` to your production domain
- [ ] Update GitHub OAuth callback URL to production domain
- [ ] Run `pnpm db:migrate` against the production database
- [ ] Ensure the Toolbox server is accessible from the application server
- [ ] Set up proper secrets management for `AUTH_SECRET` and API keys

---

## Troubleshooting

### Docker Services Not Starting

**Symptom**: `docker compose up -d` fails or services are unhealthy.

**Solutions**:
1. Check if ports 5432, 5433, or 5050 are already in use: `lsof -i :5432`
2. Remove old volumes and restart: `docker compose down -v && docker compose up -d`
3. Check logs: `docker compose logs dataweaver-db` or `docker compose logs toolbox`

### Database Connection Errors

**Symptom**: `Error: connect ECONNREFUSED 127.0.0.1:5432`

**Solutions**:
1. Ensure Docker is running: `docker compose ps`
2. Verify the `DATABASE_URL` in `.env` matches `docker-compose.yml` credentials.
3. Wait for the health check: `docker compose logs dataweaver-db` -- look for "database system is ready to accept connections".

### Prisma Migration Errors

**Symptom**: `pnpm db:migrate` fails.

**Solutions**:
1. Ensure the database is running and accessible.
2. If the schema is out of sync: `pnpm db:push` (pushes schema without migration history).
3. Reset the database entirely: Drop and recreate the database, then run `pnpm db:migrate`.

### Toolbox Server Not Responding

**Symptom**: Chat queries fail with "Tool execution failed" or the query endpoint returns 500.

**Solutions**:
1. Check the toolbox is running: `curl http://localhost:5050/api/toolset`
2. Check the sample database is running: `docker compose logs pg-sample-db`
3. Verify `TOOLBOX_URL` in `.env` is set to `http://localhost:5050`.
4. Check toolbox logs: `docker compose logs toolbox`

### AI Features Not Working

**Symptom**: Chat returns errors or AI documentation fails.

**Solutions**:
1. Verify `GOOGLE_GENERATIVE_AI_API_KEY` is set in `.env` and is valid.
2. Check that the Google Generative AI API is enabled in your Google Cloud project.
3. Check the Next.js server logs for specific error messages.

### Authentication Issues

**Symptom**: Redirected to sign-in repeatedly or GitHub OAuth fails.

**Solutions**:
1. Ensure `AUTH_SECRET` is set in `.env`.
2. For GitHub OAuth: verify the callback URL is `http://localhost:3000/api/auth/callback/github`.
3. Clear cookies and try again.
4. Check that the database is accessible (credentials are stored in the `User` table).

### Generated Prisma Client Missing

**Symptom**: Import errors for `@/generated/prisma/client`.

**Solutions**:
```bash
pnpm db:push   # This regenerates the Prisma client
# or
npx prisma generate
```

---

## License

This project is private. All rights reserved.
