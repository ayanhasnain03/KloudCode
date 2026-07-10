import {
  createContext,
  useContext,
  useRef,
  useState,
  useCallback,
} from "react";

import type { ReactNode } from "react";

import { TextAttributes } from "@opentui/core";
import { useTerminalDimensions } from "@opentui/react";
import type { ToastOptions, ToastVariant } from "../types";

import { DEFAULT_DURATION } from "../types";
import { toastIcons } from "../../theme";
import { useTheme } from "../theme";

export type ToastContextValue = {
  show: (options: ToastOptions) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const value = useContext(ToastContext);

  if (!value) {
    throw new Error("useToast must be used within a ToastProvider");
  }

  return value;
}

type ToastProviderProps = {
  children: ReactNode;
};

export function ToastProvider({ children }: ToastProviderProps) {
  const [currentToast, setCurrentToast] =
    useState<ToastOptions | null>(null);

  const timeOutHandleRef = useRef<NodeJS.Timeout | null>(null);

  const clearCurrentTimeout = useCallback(() => {
    if (timeOutHandleRef.current) {
      clearTimeout(timeOutHandleRef.current);
      timeOutHandleRef.current = null;
    }
  }, []);

  const show = useCallback(
    (opt: ToastOptions) => {
      const duration = opt.duration ?? DEFAULT_DURATION;

      clearCurrentTimeout();

      setCurrentToast({
        variant: opt.variant ?? "info",
        ...opt,
        duration,
      });

      timeOutHandleRef.current = setTimeout(() => {
        setCurrentToast(null);
      }, duration).unref();
    },
    [clearCurrentTimeout]
  );

  const value: ToastContextValue = {
    show,
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <Toast currentToast={currentToast} />
    </ToastContext.Provider>
  );
}

type ToastProps = {
  currentToast: ToastOptions | null;
};

function Toast({ currentToast }: ToastProps) {
  const { width } = useTerminalDimensions();
  const { colors } = useTheme();

  if (!currentToast) {
    return null;
  }

  const variant: ToastVariant = currentToast.variant ?? "info";
  const accent = colors[variant];
  const icon = toastIcons[variant];
  const toastWidth = Math.max(28, Math.min(48, width - 8));
  const hasTitle = Boolean(currentToast.title);

  return (
    <box
      position="absolute"
      top={2}
      right={2}
      width={toastWidth}
      flexDirection="row"
    >
      <box width={1} backgroundColor={accent} />

      <box
        flexGrow={1}
        flexDirection="column"
        backgroundColor={colors.surface}
        border
        borderStyle="rounded"
        borderColor={colors.border}
        paddingX={2}
        paddingY={1}
      >
        <box flexDirection="row" gap={1} alignItems="center" width="100%">
          <text fg={accent}>{icon}</text>

          <box flexDirection="column" flexGrow={1} gap={0}>
            {hasTitle && (
              <text fg={colors.text} wrapMode="word" width="100%">
                {currentToast.title}
              </text>
            )}
            <text
              fg={hasTitle ? colors.textDim : colors.text}
              attributes={hasTitle ? TextAttributes.DIM : undefined}
              wrapMode="word"
              width="100%"
            >
              {currentToast.message}
            </text>
          </box>
        </box>
      </box>
    </box>
  );
}
