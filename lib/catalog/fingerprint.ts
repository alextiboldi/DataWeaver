import { createHash } from "crypto";

export function computeFingerprint(
  connectionUri?: string | null,
  connectionParams?: Record<string, unknown>,
  type?: string
): string {
  if (connectionUri) {
    const url = new URL(connectionUri);
    const host = url.hostname;
    const port = url.port || "5432";
    const database = url.pathname.replace(/^\//, "");
    const normalized = `${host}:${port}/${database}`;
    return createHash("sha256").update(normalized).digest("hex");
  }

  return createHash("sha256")
    .update(JSON.stringify({ type, ...connectionParams }))
    .digest("hex");
}
