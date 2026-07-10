import {
  createContext,
  useContext,
  useRef,
  useState,
  useCallback,
  useEffect,
} from "react";

import type { ReactNode } from "react";

import { TextAttributes } from "@opentui/core";
import { useTerminalDimensions } from "@opentui/react";
import type { ToastOptions, ToastVariant } from "../types";

import { DEFAULT_DURATION } from "../types";
import { toastIcons, toastLabels } from "../../theme";
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
  const [progress, setProgress] = useState(1);

  useEffect(() => {
    if (!currentToast) {
      setProgress(1);
      return;
    }

    const duration = currentToast.duration ?? DEFAULT_DURATION;
    const startedAt = Date.now();

    const tick = () => {
      const elapsed = Date.now() - startedAt;
      setProgress(Math.max(0, 1 - elapsed / duration));
    };

    tick();
    const interval = setInterval(tick, 40);
    return () => clearInterval(interval);
  }, [currentToast]);

  if (!currentToast) {
    return null;
  }

  const variant: ToastVariant = currentToast.variant ?? "info";
  const accent = colors[variant];
  const icon = toastIcons[variant];
  const label = toastLabels[variant];
  const toastWidth = Math.max(32, Math.min(52, width - 8));
  const hasTitle = Boolean(currentToast.title);
  const progressWidth = Math.max(0, Math.round((toastWidth - 2) * progress));

  return (
    <box
      position="absolute"
      top={2}
      right={2}
      width={toastWidth}
      flexDirection="row"
      zIndex={90}
    >
      <box width={1} backgroundColor={accent} />

      <box
        flexGrow={1}
        flexDirection="column"
        backgroundColor={colors.surface}
        border
        borderStyle="rounded"
        borderColor={colors.borderSoft}
      >
        <box
          flexDirection="row"
          gap={1}
          alignItems="flex-start"
          paddingX={2}
          paddingY={1}
        >
          <box
            width={3}
            height={1}
            justifyContent="center"
            alignItems="center"
            backgroundColor={colors.dialogSurface}
            border
            borderStyle="rounded"
            borderColor={colors.border}
          >
            <text fg={accent}>{icon}</text>
          </box>

          <box flexDirection="column" flexGrow={1} gap={0}>
            <text
              fg={accent}
              attributes={TextAttributes.BOLD}
            >
              {label}
            </text>

            {hasTitle && (
              <text fg={colors.text} wrapMode="word" width="100%">
                {currentToast.title}
              </text>
            )}

            <text
              fg={hasTitle ? colors.textMuted : colors.text}
              attributes={hasTitle ? TextAttributes.DIM : undefined}
              wrapMode="word"
              width="100%"
            >
              {currentToast.message}
            </text>
          </box>
        </box>

        <box flexDirection="row" height={1} width="100%">
          {progressWidth > 0 && (
            <box width={progressWidth} backgroundColor={accent} />
          )}
          <box flexGrow={1} backgroundColor={colors.borderSoft} />
        </box>
      </box>
    </box>
  );
}
