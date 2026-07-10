import type { KeyBinding, TextareaRenderable } from "@opentui/core";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRenderer } from "@opentui/react";

import { StatusBar } from "./status-bar";
import { CommandMenu } from "./command-menu";
import { useCommandMenu } from "./command-menu/use-command-menu";
import type { Command } from "./command-menu/types";
import { useToast } from "../providers/toast";
import { useKeyboardLayer } from "../providers/keyboard-layer";
import { useDialog } from "../providers/dialog";
import { useTheme } from "../providers/theme";

type Props = {
  onSubmit: (text: string) => void;
  disabled?: boolean;
  width?: number;
};

export const TEXTAREA_KEY_BINDINGS: KeyBinding[] = [
  { name: "enter", action: "submit" },
  { name: "return", action: "submit" },
  { name: "enter", shift: true, action: "newline" },
  { name: "return", shift: true, action: "newline" },
];

export function InputBar({
  onSubmit,
  disabled = false,
  width = 64,
}: Props) {
  const {
    resolveCommand,
    commandQuery,
    handleContentChange,
    scrollRef,
    selectedIndex,
    setSelectedIndex,
    showCommandMenu,
  } = useCommandMenu();

  const textareaRef = useRef<TextareaRenderable>(null);
  const onSubmitRef = useRef<() => void>(() => { });
  const renderer = useRenderer();
  const toast = useToast();
  const dialog = useDialog()
  const { colors } = useTheme();
  const [focused, setFocused] = useState(!disabled);
  const {

    isTopLayer,
    setResponder

  } = useKeyboardLayer();
  // ----------------------------
  // COMMAND HANDLER (FIXED)
  // ----------------------------
  const handleCommand = useCallback(
    (command: Command | undefined) => {
      const textarea = textareaRef.current;
      if (!textarea || !command) return;

      textarea.setText("");

      if (command.action) {
        command.action({
          exit: () => renderer.destroy(),
          toast,
          dialog
        });
      } else {
        textarea.insertText(`${command.value} `);
      }
    },
    [renderer, toast, dialog]
  );

  // ----------------------------
  // SUBMIT NORMAL MESSAGE
  // ----------------------------
  const handleSubmit = useCallback(() => {
    if (disabled) return;

    const textarea = textareaRef.current;
    if (!textarea) return;

    const text = textarea.plainText.trim();
    if (!text) return;

    onSubmit(text);
    textarea.setText("");
  }, [disabled, onSubmit]);

  // ----------------------------
  // CONTENT CHANGE
  // ----------------------------
  const handleTextareaContentChange = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    handleContentChange(textarea.plainText);
  }, [handleContentChange]);

  // ----------------------------
  // COMMAND EXECUTE (FIXED)
  // ----------------------------
  const handleCommandExecute = useCallback(
    (index: number) => {
      const command = resolveCommand(index);
      handleCommand(command);
    },
    [resolveCommand, handleCommand]
  );

  // ----------------------------
  // REGISTER ONCE
  // ----------------------------
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    textarea.onSubmit = () => {
      onSubmitRef.current();
    };
  }, []);

  // ----------------------------
  // ALWAYS LATEST LOGIC
  // ----------------------------
  useEffect(() => {
    onSubmitRef.current = () => {
      if (disabled) return;

      if (showCommandMenu) {
        const command = resolveCommand(selectedIndex);
        handleCommand(command);
        return;
      }

      handleSubmit();
    };
  }, [
    disabled,
    showCommandMenu,
    selectedIndex,
    resolveCommand,
    handleCommand,
    handleSubmit,
  ]);
  // register base layer responder

  useEffect(() => {
    setResponder("base", () => {
      if (disabled) return false;
      const textarea = textareaRef.current;
      if (textarea && textarea.plainText.length > 0) {
        textarea.setText("");
        return true;
      }
      return true
    });
    return () => setResponder("base", null)
  }, [disabled, setResponder])
  // ----------------------------
  // UI
  // ----------------------------
  return (
    <box width={width} flexDirection="row">
      <box
        width={1}
        backgroundColor={focused ? colors.accent : colors.accentMuted}
      />

      <box flexGrow={1} flexDirection="column">
        {showCommandMenu && (
          <box paddingX={1}>
            <CommandMenu
              query={commandQuery}
              selectedIndex={selectedIndex}
              scrollRef={scrollRef}
              onSelect={setSelectedIndex}
              onExecute={handleCommandExecute}
            />
          </box>
        )}

        <box
          flexGrow={1}
          border
          borderStyle="rounded"
          borderColor={focused ? colors.accentMuted : colors.border}
          focusedBorderColor={colors.primary}
          backgroundColor={colors.surface}
          paddingX={2}
          paddingY={1}
          gap={1}
        >
          <textarea
            ref={textareaRef}
            focused={!disabled && (isTopLayer("base") || isTopLayer("command"))}
            placeholder="Ask anything..."
            keyBindings={TEXTAREA_KEY_BINDINGS}
            placeholderColor={colors.textGhost}
            textColor={colors.text}
            backgroundColor={colors.surface}
            focusedTextColor={colors.text}
            focusedBackgroundColor={colors.surface}
            onContentChange={() => {
              setFocused(true);
              handleTextareaContentChange();
            }}
          />

          <StatusBar />
        </box>
      </box>
    </box>
  );
}
