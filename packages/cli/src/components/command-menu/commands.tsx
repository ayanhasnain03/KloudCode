import { SessionDialog, ThemeDialogContent } from "../dialogs";
import type { Command, CommandContext } from "./types";
import { AgentsDialogContent } from "../dialogs/agents-dialog";
import { ModelsDialogContent } from "../dialogs/models-dialog";
import { SUPPORTED_CHAT_MODELS } from "@kloud-code/shared";
import { clearLastSessionId } from "../../lib/last-session";

export const COMMANDS: Command[] = [
  {
    name: "new",
    value: "/new",
    description: "Start a new conversation",
    action: (ctx) => {
      clearLastSessionId();
      ctx.navigate("/");
    },
  },

  {
    name: "histories",
    value: "/history",
    description: "Browse and continue previous conversations",
    action: (ctx) => {
      ctx.dialog.open({
        title: "Conversation History",
        description: "Open a previous conversation or search your history",
        children: <SessionDialog />,
        hints: "↑↓ Navigate • Enter Open • / Search • Esc Close",
        width: 72,
      });
    },
  },

  {
    name: "agents",
    value: "/agents",
    description: "Choose an AI agent for your task",
    action: (ctx) => {
      ctx.dialog.open({
        title: "Select Agent",
        description: "Choose the AI agent that best matches your workflow",
        children: (
          <AgentsDialogContent
            currentMode={ctx.mode}
            onSelect={ctx.setMode}
          />
        ),
      });
    },
  },

  {
    name: "models",
    value: "/models",
    description: "Switch the AI model",
    action: (ctx) => {
      ctx.dialog.open({
        title: "Select Model",
        description: "Choose the language model for this conversation",
        children: (
          <ModelsDialogContent
            models={SUPPORTED_CHAT_MODELS.map((model) => model.id)}
            onSelect={ctx.setModel}
          />
        ),
        width: 44,
      });
    },
  },

  {
    name: "theme",
    value: "/theme",
    description: "Customize the application's appearance",
    action: (ctx) => {
      ctx.dialog.open({
        title: "Appearance",
        description: "Choose the theme and personalise the interface",
        children: <ThemeDialogContent />,
        width: 44,
      });
    },
  },

  {
    name: "login",
    value: "/login",
    description: "Sign in to sync conversations and settings",
    action: async (ctx) => {
      // TODO
    },
  },

  {
    name: "logout",
    value: "/logout",
    description: "Sign out of your account",
    action: (ctx) => {
      // TODO
    },
  },

  {
    name: "upgrade",
    value: "/upgrade",
    description: "Upgrade your plan for higher limits",
    action: async (ctx) => {
      // TODO
    },
  },

  {
    name: "usage",
    value: "/usage",
    description: "View your usage and billing details",
    action: async (ctx) => {
      // TODO
    },
  },

  {
    name: "exit",
    value: "/exit",
    description: "Close Kloud Code",
    action: (ctx: CommandContext) => {
      ctx.exit();
    },
  },
];
