import { SessionDialog, ThemeDialogContent } from "../dialogs";
import type { Command, CommandContext } from "./types";
import { AgentsDialogContent } from "../dialogs/agents-dialog";
import { ModelsDialogContent } from "../dialogs/models-dialog";
import { SUPPORTED_CHAT_MODELS } from "@kloud-code/shared";

export const COMMANDS: Command[] = [
  {
    name: "new",
    description: "Start a new conversation",
    value: "/new",
    action: (ctx) => {
      ctx.navigate("/")
    }
  },
  {
    name: "agents",
    description: "Switch agents",
    value: "/agents",
    action: (ctx) => {
      ctx.dialog.open({
        title: "Select Mode",
        description: "Choose the agent best suited for your task",
        children: (
          <AgentsDialogContent currentMode={ctx.mode} onSelect={ctx.setMode} />
        ),
      })
    },
  },
  {
    name: "models",
    description: "Select AI model for generation",
    value: "/models",
    action: (ctx) => {
      ctx.dialog.open({
        title: "Select Model",
        description: "Choose the model to use for generation",
        children: <ModelsDialogContent models={SUPPORTED_CHAT_MODELS.map((model) => model.id)} onSelect={ctx.setModel} />,
        width: 44,
      })
    },
  },
  {
    name: "sessions",
    description: "Browse past sessions",
    value: "/sessions",
    action: (ctx) => {
      ctx.dialog.open({
        title: "Sessions",
        description: "Continue a past conversation",
        children: <SessionDialog />,
        hints: "↑↓ navigate · enter open · / search",
        width: 72,
      })
    },
  }, {
    name: "theme",
    description: "Change color theme",
    value: "/theme",
    action: (ctx) => {
      ctx.dialog.open({
        title: "Theme",
        description: "Colors follow gently as you browse",
        children: <ThemeDialogContent />,
        width: 44,
      })
    },
  },
  {
    name: "login",
    description: "Sign in with your browser",
    value: "/login",
    action: async (ctx) => {

    },
  },
  {
    name: "logout",
    description: "Sign out of your account",
    value: "/logout",
    action: (ctx) => {

    },
  },
  {
    name: "upgrade",
    description: "Buy more credits",
    value: "/upgrade",
    action: async (ctx) => {


    },
  },
  {
    name: "usage",
    description: "Open billing portal in your browser",
    value: "/usage",
    action: async (ctx) => {

    },
  },
  {
    name: "exit",
    description: "Exit the application",
    value: "/exit",
    action: (ctx: CommandContext) => {
      ctx.exit();
    }
  }
];
