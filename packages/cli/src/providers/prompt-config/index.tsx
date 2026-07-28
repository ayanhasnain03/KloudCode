import {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  useRef,
} from "react";

import type { ReactNode } from "react";

import { DEFAULT_CHAT_MODEL_ID, type SupportedChatModelId } from "@kloud-code/shared";

import { Mode } from "@kloud-code/database/enums";

type PromptConfigActions = {
  toggleMode: () => void;
  setMode: (mode: Mode) => void;
  setModel: (model: SupportedChatModelId) => void;
  getMode: () => Mode;
  getModel: () => SupportedChatModelId;
};

type PromptConfigContextValue = PromptConfigActions & {
  mode: Mode;
  model: SupportedChatModelId;
};

const ModeStateContext = createContext<Mode | undefined>(undefined);
const ModelStateContext = createContext<SupportedChatModelId | undefined>(
  undefined,
);
const PromptConfigActionsContext = createContext<
  PromptConfigActions | undefined
>(undefined);

export function usePromptConfigMode(): Mode {
  const value = useContext(ModeStateContext);
  if (value === undefined) {
    throw new Error(
      "usePromptConfigMode must be used within a PromptConfigProvider",
    );
  }
  return value;
}

export function usePromptConfigModel(): SupportedChatModelId {
  const value = useContext(ModelStateContext);
  if (value === undefined) {
    throw new Error(
      "usePromptConfigModel must be used within a PromptConfigProvider",
    );
  }
  return value;
}

/**
 * Stable actions only — this context value never changes identity, so
 * components that just need to read or set mode/model (the input bar) do not
 * re-render when the mode flips.
 */
export function usePromptConfigActions(): PromptConfigActions {
  const value = useContext(PromptConfigActionsContext);
  if (!value) {
    throw new Error(
      "usePromptConfigActions must be used within a PromptConfigProvider",
    );
  }
  return value;
}

export function usePromptConfig(): PromptConfigContextValue {
  return {
    mode: usePromptConfigMode(),
    model: usePromptConfigModel(),
    ...usePromptConfigActions(),
  };
}

type PromptConfigProviderProps = {
  children: ReactNode;
};

export function PromptConfigProvider({
  children,
}: PromptConfigProviderProps) {
  const [mode, setModeState] = useState<Mode>(Mode.BUILD);
  const [model, setModelState] = useState<SupportedChatModelId>(
    DEFAULT_CHAT_MODEL_ID,
  );

  const modeRef = useRef(mode);
  const modelRef = useRef(model);
  modeRef.current = mode;
  modelRef.current = model;

  const setMode = useCallback((next: Mode) => {
    modeRef.current = next;
    setModeState(next);
  }, []);

  const setModel = useCallback((next: SupportedChatModelId) => {
    modelRef.current = next;
    setModelState(next);
  }, []);

  const toggleMode = useCallback(() => {
    setMode(modeRef.current === Mode.BUILD ? Mode.PLAN : Mode.BUILD);
  }, [setMode]);

  const actions = useMemo<PromptConfigActions>(
    () => ({
      toggleMode,
      setMode,
      setModel,
      getMode: () => modeRef.current,
      getModel: () => modelRef.current,
    }),
    [toggleMode, setMode, setModel],
  );

  return (
    <PromptConfigActionsContext.Provider value={actions}>
      <ModeStateContext.Provider value={mode}>
        <ModelStateContext.Provider value={model}>
          {children}
        </ModelStateContext.Provider>
      </ModeStateContext.Provider>
    </PromptConfigActionsContext.Provider>
  );
}
