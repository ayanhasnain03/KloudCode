import {
  createContext,
  useContext,
  useRef,
  useState,
  useCallback,
  useMemo,
} from "react";

import type { ReactNode } from "react";

import { TextAttributes } from "@opentui/core";
import { useTerminalDimensions } from "@opentui/react";
import type { ToastOptions, ToastVariant } from "../types";

import { DEFAULT_DURATION, VARIANT_DURATION } from "../types";
import { toastIcons } from "../../theme";
import { useTheme } from "../theme";

export type ToastContextValue = {
  show: (options: ToastOptions) => void;
  success: (message: string, title?: string) => void;
  error: (message: string, title?: string) => void;
  info: (message: string, title?: string) => void;
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

  const timeOutHandleRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearCurrentTimeout = useCallback(() => {
    if (timeOutHandleRef.current) {
      clearTimeout(timeOutHandleRef.current);
      timeOutHandleRef.current = null;
    }
  }, []);

  const show = useCallback(
    (opt: ToastOptions) => {
      const variant = opt.variant ?? "info";
      const duration =
        opt.duration ?? VARIANT_DURATION[variant] ?? DEFAULT_DURATION;

      clearCurrentTimeout();

      setCurrentToast({
        ...opt,
        variant,
        duration,
      });

      timeOutHandleRef.current = setTimeout(() => {
        setCurrentToast(null);
        timeOutHandleRef.current = null;
      }, duration);
    },
    [clearCurrentTimeout],
  );

  const value = useMemo<ToastContextValue>(
    () => ({
      show,
      success: (message, title) => show({ message, title, variant: "success" }),
      error: (message, title) => show({ message, title, variant: "error" }),
      info: (message, title) => show({ message, title, variant: "info" }),
    }),
    [show],
  );

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

  const isOpen = currentToast !== null;
  const variant: ToastVariant = currentToast?.variant ?? "info";
  const accent = colors[variant];
  const icon = toastIcons[variant];
  const message = currentToast?.title
    ? `${currentToast.title} — ${currentToast.message}`
    : (currentToast?.message ?? "");

  // Compact single-line toast; fixed size avoids OpenTUI expand-after-0 bugs.
  const toastWidth = Math.max(28, Math.min(48, width - 8));
  const toastHeight = 3;

  return (
    <box
      position="absolute"
      top={1}
      right={2}
      width={isOpen ? toastWidth : 0}
      height={isOpen ? toastHeight : 0}
      overflow="hidden"
      zIndex={90}
    >
      {currentToast && (
        <box
          width="100%"
          height="100%"
          flexDirection="row"
          alignItems="center"
          gap={1}
          paddingX={1}
          backgroundColor={colors.surface}
          border
          borderStyle="rounded"
          borderColor={colors.borderSoft}
        >
          <text fg={accent} attributes={TextAttributes.BOLD}>
            {icon}
          </text>
          <text fg={colors.textMuted} wrapMode="none">
            {message.length > toastWidth - 6
              ? `${message.slice(0, toastWidth - 9)}…`
              : message}
          </text>
        </box>
      )}
    </box>
  );
}
