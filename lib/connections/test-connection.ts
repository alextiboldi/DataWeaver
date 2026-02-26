import net from "net";
import { access } from "fs/promises";

import { getSourceType } from "./source-registry";
import { getToolboxClient } from "@/lib/toolbox/client";

export interface TestConnectionResult {
  success: boolean;
  error?: string;
  latencyMs?: number;
}

export async function testConnection(
  type: string,
  params: Record<string, unknown>
): Promise<TestConnectionResult> {
  const sourceDef = getSourceType(type);
  if (!sourceDef) {
    return { success: false, error: `Unknown source type: ${type}` };
  }

  switch (sourceDef.testStrategy) {
    case "pg-direct":
      return testPgDirect(params);
    case "tcp-check":
      return testTcpCheck(params);
    case "file-check":
      return testFileCheck(params);
    case "toolbox-ping":
      return testToolboxPing();
    default:
      return {
        success: false,
        error: `Unsupported test strategy: ${sourceDef.testStrategy}`,
      };
  }
}

async function testPgDirect(
  params: Record<string, unknown>
): Promise<TestConnectionResult> {
  try {
    // Dynamic import so the pg dependency is only loaded when needed
    const { Pool } = await import("pg");

    const pool = new Pool({
      host: String(params.host ?? "localhost"),
      port: Number(params.port ?? 5432),
      database: String(params.database ?? ""),
      user: String(params.user ?? ""),
      password: String(params.password ?? ""),
      max: 1,
      connectionTimeoutMillis: 5000,
    });

    const start = performance.now();
    try {
      await pool.query("SELECT 1");
      const latencyMs = Math.round(performance.now() - start);
      return { success: true, latencyMs };
    } finally {
      await pool.end();
    }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

function testTcpCheck(
  params: Record<string, unknown>
): Promise<TestConnectionResult> {
  const host = String(params.host ?? "localhost");
  const port = Number(params.port ?? 0);

  return new Promise((resolve) => {
    const start = performance.now();
    const socket = net.connect({ host, port, timeout: 5000 });

    socket.on("connect", () => {
      const latencyMs = Math.round(performance.now() - start);
      socket.destroy();
      resolve({ success: true, latencyMs });
    });

    socket.on("timeout", () => {
      socket.destroy();
      resolve({
        success: false,
        error: `Connection to ${host}:${port} timed out after 5000ms`,
      });
    });

    socket.on("error", (err) => {
      socket.destroy();
      resolve({ success: false, error: err.message });
    });
  });
}

async function testFileCheck(
  params: Record<string, unknown>
): Promise<TestConnectionResult> {
  const filepath = String(params.filepath ?? "");
  if (!filepath) {
    return { success: false, error: "No file path provided" };
  }

  try {
    const start = performance.now();
    await access(filepath);
    const latencyMs = Math.round(performance.now() - start);
    return {
      success: true,
      latencyMs,
    };
  } catch {
    return {
      success: false,
      error: `File not found or not accessible: ${filepath}`,
    };
  }
}

async function testToolboxPing(): Promise<TestConnectionResult> {
  try {
    const client = getToolboxClient();
    const start = performance.now();
    const ok = await client.ping();
    const latencyMs = Math.round(performance.now() - start);

    if (ok) {
      return { success: true, latencyMs };
    }
    return {
      success: false,
      error: "Toolbox server did not respond successfully",
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
