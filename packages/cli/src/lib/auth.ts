import {
  existsSync,
  mkdirSync,
  readFileSync,
  unlinkSync,
  writeFileSync
} from "node:fs"
import { homedir } from "node:os"
import { join } from "node:path"

type AuthData = {
  token: string;
}

const AUTH_DIR = join(homedir(), ".kloud-code")
const AUTH_FILE = join(AUTH_DIR, "auth.json");

export function getAuth(): AuthData | null {
  try {
    const data = readFileSync(AUTH_FILE, "utf-8");
    const parsed = JSON.parse(data) as Partial<AuthData>;
    return typeof parsed.token === "string" ? { token: parsed.token } : null;
  } catch (error) {
    return null;
  }
}

export function isLoggedIn(): boolean {
  return getAuth() !== null;
}


export function saveAuth(data: AuthData) {
  if (!existsSync(AUTH_DIR)) {
    mkdirSync(AUTH_DIR, { recursive: true, mode: 0o600 });
  }

  writeFileSync(AUTH_FILE, JSON.stringify(data, null, 2), { mode: 0o600 });
}
export function clearAuth() {
  if (existsSync(AUTH_FILE)) {
    unlinkSync(AUTH_FILE);
  }
}
