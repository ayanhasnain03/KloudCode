import type { SupportedChatModelId } from "@kloud-code/shared";
import type { DialogContextValue } from "../../providers/dialog";
import type { ToastContextValue } from "../../providers/toast";
import type { Mode } from "@kloud-code/database/enums";

export type CommandContext = {
  exit: () => void;
  toast: ToastContextValue;
  dialog: DialogContextValue;
  navigate: (path: string) => void;
  mode: Mode;
  setMode: (mode: Mode) => void;
  setModel: (model: SupportedChatModelId) => void;
}


export type Command = {
  name: string;
  description: string;
  value: string;
  action?: (ctx: CommandContext) => void;
}
