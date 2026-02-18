import { createHash } from "crypto";

export function computeFingerprint(connectionUri: string): string {
  const url = new URL(connectionUri);
  const host = url.hostname;
  const port = url.port || "5432";
  const database = url.pathname.replace(/^\//, "");
  const normalized = `${host}:${port}/${database}`;
  return createHash("sha256").update(normalized).digest("hex");
}
