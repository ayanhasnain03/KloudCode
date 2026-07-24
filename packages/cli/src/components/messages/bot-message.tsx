import { useEffect, useState } from "react";
import { useTerminalDimensions } from "@opentui/react";
import { useTheme } from "../../providers/theme";
import { TextAttributes } from "@opentui/core";
import type { ClientMessagePart } from "../../hooks/use-chat";
import { Mode } from "@kloud-code/database/enums";

type Props = {
  parts: ClientMessagePart[];
  model: string;
  mode: Mode;
  duration?: string;
  streaming?: boolean;
  interrupted?: boolean;
};

// Blinking caret that only ticks while a response is actively streaming.
function useCursorBlink(active: boolean, intervalMs = 450) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (!active) {
      setVisible(true);
      return;
    }
    const id = setInterval(() => setVisible((v) => !v), intervalMs);
    return () => clearInterval(id);
  }, [active, intervalMs]);

  return active && visible;
}

export function BotMessage({
  parts,
  model,
  mode,
  duration,
  streaming = false,
  interrupted = false,
}: Props) {
  const text = parts
    .filter((p) => p.type === "text")
    .map((p) => p.text)
    .join("");

  const { width } = useTerminalDimensions();
  const { colors } = useTheme();

  const boxWidth = Math.min(Math.max(width - 16, 52), 76);

  const modeColor =
    mode === Mode.BUILD
      ? colors.success
      : colors.primary;

  const accentColor = interrupted ? colors.error : modeColor;
  const borderColor = interrupted ? colors.error : colors.borderSoft;

  const cursorVisible = useCursorBlink(streaming);
  const isThinking = streaming && text.length === 0;
  const hasText = text.length > 0;

  return (
    <box flexDirection="row" width={boxWidth}>
      {/* Accent rail */}
      <box width={1} backgroundColor={accentColor} />

      <box
        flexGrow={1}
        flexDirection="column"
        border
        borderStyle="rounded"
        borderColor={borderColor}
        backgroundColor={colors.surface}
      >
        {/* Header */}
        <box
          paddingX={2}
          paddingY={1}
          backgroundColor={colors.thinkingBorder}
          justifyContent="space-between"
          alignItems="center"
          flexDirection="row"
        >
          {/* Left */}
          <box gap={1} flexDirection="row" alignItems="center">
            <text fg={interrupted ? colors.error : colors.primary}>
              {interrupted ? "◼" : "✦"}
            </text>
            <text fg={colors.text} attributes={TextAttributes.BOLD}>
              {model}
            </text>
          </box>

          {/* Right */}
          <box gap={1} flexDirection="row" alignItems="center">
            {!interrupted && (
              <text fg={modeColor} attributes={TextAttributes.BOLD}>
                {mode}
              </text>
            )}

            {interrupted ? (
              <box flexDirection="row" gap={1} alignItems="center">
                <text fg={colors.error} attributes={TextAttributes.BOLD}>
                  Interrupted
                </text>
              </box>
            ) : (
              !streaming &&
              duration && <text fg={colors.textMuted}>• {duration}</text>
            )}
          </box>
        </box>

        {/* Message */}
        <box paddingX={2} paddingY={1} flexDirection="column" gap={1}>
          {isThinking ? (
            <text fg={colors.textMuted}>Thinking…</text>
          ) : hasText ? (
            <text
              fg={interrupted ? colors.textMuted : colors.text}
              wrapMode="word"
              width="100%"
            >
              {text}
              {streaming && cursorVisible ? "▋" : ""}
            </text>
          ) : interrupted ? (
            <text fg={colors.textGhost} attributes={TextAttributes.DIM}>
              No response generated
            </text>
          ) : null}

          {interrupted && hasText && (
            <box flexDirection="row" gap={1} alignItems="center">
              <text fg={colors.error} attributes={TextAttributes.DIM}>
                ─
              </text>
              <text fg={colors.textMuted} attributes={TextAttributes.DIM}>
                stopped before completion
              </text>
            </box>
          )}
        </box>
      </box>
    </box>
  );
}
