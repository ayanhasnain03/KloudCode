import type { Command } from "./types";
import { COMMANDS } from "./commands";
import { isLoggedIn } from "../../lib/auth";

function getAvailableCommands(): Command[] {
  const loggedIn = isLoggedIn();
  return COMMANDS.filter((command) => {
    if (command.name === "login") return !loggedIn;
    if (command.name === "logout") return loggedIn;
    return true;
  });
}

export function getFilteredCommands(
  query: string
): Command[] {
  const available = getAvailableCommands();
  if (query.length === 0) return available;
  return available.filter((command) =>
    command.name.toLowerCase().startsWith(query.toLowerCase())
  );
}
