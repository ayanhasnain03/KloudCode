import { createContext, useContext } from "react";

/**
 * Loading lives in context so StatusBar can update without re-rendering
 * InputBar's focused textarea — that re-render path segfaults OpenTUI
 * during long bash/tool streams (then the process dies and restarts on /).
 */
export const SessionLoadingContext = createContext(false);

export function useSessionLoading(): boolean {
  return useContext(SessionLoadingContext);
}
