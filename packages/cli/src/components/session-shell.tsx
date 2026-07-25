import { TextAttributes } from "@opentui/core";
import type { ReactNode } from "react";
import { InputBar } from "./input-bar";
import { usePromptConfig } from "../providers/prompt-config";

type Props = {
  children?: ReactNode;
  onSubmit: (text: string) => void;
  inputDisabled?: boolean;
  loading?: boolean;
  interruptible?: boolean;
};

export function SessionShell({
  children,
  onSubmit,
  inputDisabled = false,
  loading = false,
  interruptible = false,
}: Props) {
  const { mode } = usePromptConfig();
  return (
    <box
      flexDirection="column"
      flexGrow={1}
      width="100%"
      height="100%"
      paddingY={1}
      paddingX={2}
      gap={1}
    >
      <scrollbox flexGrow={1} width="100%" stickyScroll stickyStart="bottom">
        <box gap={1}>{children}</box>
      </scrollbox>
      <box flexShrink={0} width="100%">
        <InputBar
          onSubmit={onSubmit}
          disabled={inputDisabled}
          loading={loading}
        />
      </box>
      <box
        flexShrink={0}
        flexDirection="row"
        justifyContent="flex-end"
        width="100%"
        height={1}
        gap={1}
        paddingLeft={1}
      >
        <text>tab</text>
        <text attributes={TextAttributes.DIM}>{mode}</text>
      </box>
    </box>
  );
};
