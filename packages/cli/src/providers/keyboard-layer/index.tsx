import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  useRef
} from "react";

import { useKeyboard, useRenderer } from "@opentui/react";

type Responder = () => boolean;

type KeyboardLayerContextValue = {
  push: (id: string, responder?: Responder) => void;
  pop: (id: string) => void;
  isTopLayer: (id: string) => boolean;
  setResponder: (id: string, responder: Responder | null) => void;
  topLayer: string;
}

const KeyboardLayerContext = createContext<KeyboardLayerContextValue | null>(null);

const BASE_LAYER = "base";


export function KeyboardLayerProvider({ children }: {
  children: React.ReactNode
}) {

  const [stack, setStack] = useState<string[]>([BASE_LAYER])
  const stackRef = useRef(stack)
  stackRef.current = stack;

  const responders = useRef<Map<string, Responder>>(new Map());
  const renderer = useRenderer();
  const push = useCallback((id: string, responder?: Responder) => {
    if (responder) {
      responders.current.set(id, responder)
    }

    setStack((prev) => {
      if (prev.includes(id)) {
        return prev;
      }
      return [...prev, id]
    })
  }, []);


  const pop = useCallback((id: string) => {
    responders.current.delete(id);
    setStack((prev) => prev.filter((layer) => layer !== id))
  }, [])

  const topLayer = stack[stack.length - 1] ?? BASE_LAYER;

  const isTopLayer = useCallback(
    (id: string) => topLayer === id,
    [topLayer],
  );

  const setResponder = useCallback((id: string, responder: Responder | null) => {
    if (responder) {
      responders.current.set(id, responder)
    } else {
      responders.current.delete(id)
    }
  }, [])

  useKeyboard((key) => {
    if (!key.ctrl || key.name !== "c") return;
    const currentStack = stackRef.current;
    for (
      let i = currentStack.length - 1;
      i >= 0;
      i--
    ) {
      const layerId = currentStack[i]!;
      const responder = responders.current.get(layerId);
      if (responder && responder()) {
        return;
      }
    }
    // Destroying the renderer from inside the key handler tears down native
    // nodes mid-frame; let the current frame finish first.
    setTimeout(() => renderer.destroy(), 0);
  })

  // Only changes when the active layer changes, so consumers (notably the
  // input bar wrapping the focused textarea) do not re-render on unrelated
  // provider updates.
  const value = useMemo<KeyboardLayerContextValue>(
    () => ({ push, pop, isTopLayer, setResponder, topLayer }),
    [push, pop, isTopLayer, setResponder, topLayer],
  );

  return (
    <KeyboardLayerContext.Provider value={value}>
      {children}
    </KeyboardLayerContext.Provider >
  )
}


export function useKeyboardLayer() {
  const context = useContext(KeyboardLayerContext);
  if (!context) {
    throw new Error("UseKeyboardLayer must be used within a keyboardlayer provider")
  }
  return context
}
