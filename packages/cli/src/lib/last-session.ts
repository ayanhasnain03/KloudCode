import { mkdirSync, readFileSync, writeFileSync, unlinkSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const CONFIG_DIR = join(homedir(), ".kloud-code");
const LAST_SESSION_PATH = join(CONFIG_DIR, "last-session.json");

type LastSession = {
  id: string;
};

export function readLastSessionId(): string | null {
  try {
    const data = JSON.parse(readFileSync(LAST_SESSION_PATH, "utf-8")) as Partial<LastSession>;
    return typeof data.id === "string" && data.id.length > 0 ? data.id : null;
  } catch {
    return null;
  }
}

export function writeLastSessionId(id: string): void {
  try {
    mkdirSync(CONFIG_DIR, { recursive: true });
    writeFileSync(LAST_SESSION_PATH, JSON.stringify({ id } satisfies LastSession), "utf-8");
  } catch {
    // Best-effort — crash recovery is optional.
  }
}

export function clearLastSessionId(): void {
  try {
    unlinkSync(LAST_SESSION_PATH);
  } catch {
    // ignore
  }
}
