import type {
  ToolboxToolset,
  ToolboxToolResult,
  ToolboxRawResponse,
} from "@/lib/types/toolbox";

const TOOLBOX_URL = process.env.TOOLBOX_URL || "http://localhost:5050";

export class ToolboxClient {
  private baseUrl: string;

  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl || TOOLBOX_URL;
  }

  async ping(): Promise<boolean> {
    try {
      const res = await fetch(`${this.baseUrl}/api/toolset`, {
        signal: AbortSignal.timeout(5000),
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  async loadToolset(toolsetName: string): Promise<ToolboxToolset> {
    const res = await fetch(
      `${this.baseUrl}/api/toolset/${toolsetName}`
    );
    if (!res.ok) {
      throw new Error(`Failed to load toolset: ${res.statusText}`);
    }
    return res.json();
  }

  async executeTool(
    toolName: string,
    params: Record<string, unknown> = {}
  ): Promise<ToolboxToolResult> {
    const res = await fetch(`${this.baseUrl}/api/tool/${toolName}/invoke`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    });
    if (!res.ok) {
      const error = await res.text();
      throw new Error(`Tool execution failed: ${error}`);
    }
    const raw: ToolboxRawResponse = await res.json();
    const parsed = JSON.parse(raw.result);
    const rows: Record<string, unknown>[] = Array.isArray(parsed)
      ? parsed
      : parsed == null
        ? []
        : [parsed];
    return { rows };
  }
}

let _client: ToolboxClient | null = null;
export function getToolboxClient(): ToolboxClient {
  if (!_client) {
    _client = new ToolboxClient();
  }
  return _client;
}
