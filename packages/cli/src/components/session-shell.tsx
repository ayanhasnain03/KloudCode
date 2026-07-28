import {
  memo,
  useRef,
  type ReactNode,
} from "react";
import { InputBar } from "./input-bar";
import { usePromptConfigActions } from "../providers/prompt-config";
import { SessionLoadingContext } from "../providers/session-loading";
import type { Mode } from "@kloud-code/database/enums";
import type { SupportedChatModelId } from "@kloud-code/shared";

type Props = {
  children?: ReactNode;
  onSubmit: (
    text: string,
    mode: Mode,
    model: SupportedChatModelId,
  ) => void;
  inputDisabled?: boolean;
  loading?: boolean;
};

const SessionInput = memo(function SessionInput({
  onSubmit,
  inputDisabled,
}: {
  onSubmit: Props["onSubmit"];
  inputDisabled: boolean;
}) {
  // Actions context is stable across Tab — this wrapper (and InputBar's
  // textarea) must not re-render when mode flips or messages stream.
  const { getMode, getModel } = usePromptConfigActions();
  const onSubmitRef = useRef(onSubmit);
  onSubmitRef.current = onSubmit;

  return (
    <box flexShrink={0} width="100%">
      <InputBar
        onSubmit={(text) =>
          onSubmitRef.current(text, getMode(), getModel())
        }
        disabled={inputDisabled}
      />
    </box>
  );
});

export function SessionShell({
  children,
  onSubmit,
  inputDisabled = false,
  loading = false,
}: Props) {
  // No mode subscription here — Tab must not reconcile the message scrollbox.
  return (
    <SessionLoadingContext.Provider value={loading}>
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
        <SessionInput onSubmit={onSubmit} inputDisabled={inputDisabled} />
      </box>
    </SessionLoadingContext.Provider>
  );
}
