import { createContext, useContext, useState, useCallback } from "react";

import type { ReactNode } from "react";

import { TextAttributes, RGBA } from "@opentui/core";

import { useKeyboard, useTerminalDimensions } from "@opentui/react";

import type { DialogConfig } from "./types";
import { useKeyboardLayer } from "../keyboard-layer";
import { useTheme } from "../theme";


export type DialogContextValue = {
  open: (config: DialogConfig) => void
  close: () => void
}

const DialogContext = createContext<DialogContextValue | null>(null);


export function useDialog(): DialogContextValue {
  const value = useContext(DialogContext);
  if (!value) throw new Error("useDialog must be used withing DialogProvider");
  return value
}


export function DialogProvider({
  children
}: {
  children: ReactNode
}) {
  const [currentDialog, setCurrentDialog] = useState<DialogConfig | null>(null);
  const { push, pop } = useKeyboardLayer();


  const close = useCallback(() => {
    setCurrentDialog(null);
    pop("dialog")
  }, [pop])

  const open = useCallback((config: DialogConfig) => {
    setCurrentDialog(config);
    push("dialog", () => {
      close();
      return true
    })
  }, [push, close])

  const value: DialogContextValue = {
    open,
    close,
  };

  return (
    <DialogContext.Provider value={value}>
      {children}
      <Dialog currentDialog={currentDialog} close={close} />
    </DialogContext.Provider>
  )
}

type DialogProps = {
  currentDialog: DialogConfig | null;
  close: () => void;
};

function Dialog({ currentDialog, close }: DialogProps) {
  const { isTopLayer } = useKeyboardLayer();
  const { colors } = useTheme();
  const dimensions = useTerminalDimensions();


  useKeyboard((key) => {
    if (!currentDialog || !isTopLayer("dialog")) return;

    if (key.name === "escape") {
      close();
    }
  });

  if (!currentDialog) {
    return null;
  }

  const { title, description, children, hints } = currentDialog;
  const dialogWidth = Math.min(56, dimensions.width - 8);

  return (
    <box
      position="absolute"
      left={0}
      top={0}
      width={dimensions.width}
      height={dimensions.height}
      justifyContent="center"
      alignItems="center"
      backgroundColor={RGBA.fromInts(0, 0, 0, 165)}
      zIndex={100}
      onMouseDown={() => close()}
    >
      <box
        width={dialogWidth}
        flexDirection="row"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <box width={1} backgroundColor={colors.primary} />

        <box
          flexGrow={1}
          flexDirection="column"
          backgroundColor={colors.dialogSurface}
          border
          borderStyle="rounded"
          borderColor={colors.border}
          paddingX={2}
          paddingY={1}
          gap={1}
        >
          <box
            flexDirection="row"
            alignItems="flex-start"
            justifyContent="space-between"
          >
            <box flexDirection="column" gap={0} flexGrow={1}>
              <text attributes={TextAttributes.BOLD} fg={colors.text}>
                {title}
              </text>
              {description && (
                <text attributes={TextAttributes.DIM} fg={colors.textGhost}>
                  {description}
                </text>
              )}
            </box>

            <text attributes={TextAttributes.DIM} fg={colors.textGhost}>
              esc
            </text>
          </box>

          <box height={1} width="100%" backgroundColor={colors.borderSoft} />

          <box flexGrow={1}>
            {children}
          </box>

          {hints && (
            <box flexDirection="row" justifyContent="center">
              <text attributes={TextAttributes.DIM} fg={colors.textGhost}>
                {hints}
              </text>
            </box>
          )}
        </box>
      </box>
    </box>
  );
};
