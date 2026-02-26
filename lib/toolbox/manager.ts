import { exec } from "child_process";
import { writeToolboxConfig } from "./generate-config";
import { getToolboxClient } from "./client";

const TOOLBOX_CONTAINER_NAME =
  process.env.TOOLBOX_CONTAINER_NAME ?? "dataweaver-toolbox-1";

const POLL_INTERVAL_MS = 2000;
const MAX_POLL_ATTEMPTS = 10;

async function pollUntilReady(): Promise<void> {
  const client = getToolboxClient();
  for (let i = 0; i < MAX_POLL_ATTEMPTS; i++) {
    const ok = await client.ping();
    if (ok) return;
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
  }
  throw new Error(
    `Toolbox container did not become ready after ${MAX_POLL_ATTEMPTS * POLL_INTERVAL_MS}ms`
  );
}

function restartContainer(): Promise<void> {
  return new Promise((resolve, reject) => {
    exec(`docker restart ${TOOLBOX_CONTAINER_NAME}`, (err) => {
      if (err) reject(new Error(`Failed to restart toolbox container: ${err.message}`));
      else resolve();
    });
  });
}

export async function regenerateAndRestart(): Promise<void> {
  await writeToolboxConfig();
  await restartContainer();
  await pollUntilReady();
}
