import { ThemeDialogContent } from "../dialogs";
import type { Command, CommandContext } from "./types";

export const COMMANDS: Command[] = [
  {
    name: "new",
    description: "Start a new conversation",
    value: "/new",
    action: (ctx) => {

      ctx.toast.show({
        title: "New conversation",
        message: "Ready when you are.",
        variant: "success",
      })
    }
  },
  {
    name: "agents",
    description: "Switch agents",
    value: "/agents",
    action: (ctx) => {
      ctx.dialog.open({
        title: "Select Agent",
        description: "Choose the agent best suited for your task",
        children: (
          <text>
            Agent selection coming soon.
          </text>
        ),
      })
    },
  },
  {
    name: "models",
    description: "Select AI model for generation",
    value: "/models",
    action: (ctx) => {

    },
  },
  {
    name: "sessions",
    description: "Browse past sessions",
    value: "/sessions",
    action: (ctx) => {

    },
  }, {
    name: "theme",
    description: "Change color theme",
    value: "/theme",
    action: (ctx) => {
      ctx.dialog.open({
        title: "Color Theme",
        description: "Preview instantly, confirm with Enter",
        children: <ThemeDialogContent />,
        hints: "↑↓ navigate · enter select",
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
