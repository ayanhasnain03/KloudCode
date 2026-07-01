import type { KeyBinding, TextareaRenderable } from "@opentui/core";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRenderer } from "@opentui/react";

import { StatusBar } from "./status-bar";
import { CommandMenu } from "./command-menu";
import { useCommandMenu } from "./command-menu/use-command-menu";
import type { Command } from "./command-menu/types";
import { palette } from "../theme";

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

  const [focused, setFocused] = useState(!disabled);

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
          exit() {
            renderer.destroy();
          },
        });
      } else {
        textarea.insertText(`${command.value} `);
      }
    },
    [renderer]
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

  // ----------------------------
  // UI
  // ----------------------------
  return (
    <box width={width} flexDirection="row">
      <box
        width={1}
        backgroundColor={focused ? palette.copperLight : palette.copperMuted}
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
          borderColor={focused ? palette.copperMuted : palette.border}
          focusedBorderColor={palette.copper}
          backgroundColor={palette.elevated}
          paddingX={2}
          paddingY={1}
          gap={1}
        >
          <textarea
            ref={textareaRef}
            focused={!disabled}
            placeholder="Ask anything..."
            keyBindings={TEXTAREA_KEY_BINDINGS}
            placeholderColor={palette.silverGhost}
            textColor={palette.platinum}
            backgroundColor={palette.elevated}
            focusedTextColor={palette.platinum}
            focusedBackgroundColor={palette.elevated}
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
