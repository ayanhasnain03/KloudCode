import { useEffect, useState } from "react";
import { useTerminalDimensions } from "@opentui/react";
import { useTheme } from "../../providers/theme";
import { TextAttributes } from "@opentui/core";
import type { ClientMessagePart, ClientToolCallPart } from "../../hooks/use-chat";
import { Mode } from "@kloud-code/database/enums";
import type { ThemeColors } from "../../theme";
import { Spinner } from "../spinner";

type Props = {
  parts: ClientMessagePart[];
  model: string;
  mode: Mode;
  duration?: string;
  streaming?: boolean;
  interrupted?: boolean;
};

type PartGroup = {
  type: ClientMessagePart["type"];
  parts: ClientMessagePart[];
  key: string;
};

function formatToolName(name: string): string {
  return name
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/^./, (str) => str.toUpperCase());
}

function formatToolArgs(tc: ClientToolCallPart, maxLen = 48): string {
  const values = Object.values(tc.args)
    .map((v) => {
      if (typeof v === "string") return v;
      if (typeof v === "number" || typeof v === "boolean") return String(v);
      try {
        return JSON.stringify(v);
      } catch {
        return String(v);
      }
    })
    .filter((v) => v.length > 0);

  if (values.length === 0) return "";

  const joined = values.join(" ");
  if (joined.length <= maxLen) return joined;
  return `${joined.slice(0, maxLen - 1)}…`;
}

function truncateResult(result: string, maxLen = 72): string {
  // Strip ANSI/control chars — they can corrupt OpenTUI layout.
  const cleaned = result
    .replace(/\u001b\[[0-9;]*m/g, "")
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, "");
  const oneLine = cleaned.replace(/\s+/g, " ").trim();
  if (oneLine.length <= maxLen) return oneLine;
  return `${oneLine.slice(0, maxLen - 1)}…`;
}

/**
 * Merge consecutive same-type parts. Tool calls are merged into ONE group so
 * we render a single stable ToolsBlock instead of mounting a new row per bash
 * call (that mount churn segfaults OpenTUI during long installs).
 */
function groupConsecutiveParts(parts: ClientMessagePart[]): PartGroup[] {
  const groups: PartGroup[] = [];

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    if (!part) continue;

    const lastGroup = groups[groups.length - 1];
    if (lastGroup && lastGroup.type === part.type) {
      lastGroup.parts.push(part);
    } else {
      groups.push({
        type: part.type,
        parts: [part],
        key: `group-${part.type}-${i}`,
      });
    }
  }

  return groups;
}

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

function ReasoningBlock({
  text,
  streaming,
  colors,
}: {
  text: string;
  streaming: boolean;
  colors: ThemeColors;
}) {
  const trimmed = text.trim();
  if (!trimmed && !streaming) return null;

  return (
    <box flexDirection="column" gap={0}>
      <box flexDirection="row" gap={1} alignItems="center">
        <text fg={colors.thinking}>{streaming ? "✧" : "✦"}</text>
        <text fg={colors.thinking} attributes={TextAttributes.DIM}>
          {streaming ? "Thinking" : "Thought"}
        </text>
      </box>
      <text fg={colors.textMuted} wrapMode="word" width="100%">
        {trimmed || " "}
      </text>
    </box>
  );
}

/**
 * One stable box + one text node. Content updates in place — never mounts a
 * new row per tool (bash/npm/shadcn), which is what crashed OpenTUI before.
 */
function ToolsBlock({
  tools,
  colors,
}: {
  tools: ClientToolCallPart[];
  colors: ThemeColors;
}) {
  const lines = tools
    .map((tc) => {
      const mark = tc.status === "calling" ? "◉" : "✓";
      const args = formatToolArgs(tc);
      const head = `${mark} ${formatToolName(tc.name)}${args ? ` ${args}` : ""}`;
      if (tc.status === "done" && tc.result) {
        return `${head}\n  ↳ ${truncateResult(tc.result)}`;
      }
      return head;
    })
    .join("\n");

  return (
    <box flexDirection="column" gap={0}>
      <text fg={colors.textMuted} wrapMode="word" width="100%">
        {lines || " "}
      </text>
    </box>
  );
}

function TextBlock({
  text,
  showCursor,
  interrupted,
  colors,
}: {
  text: string;
  showCursor: boolean;
  interrupted: boolean;
  colors: ThemeColors;
}) {
  if (!text && !showCursor) return null;

  return (
    <text
      fg={interrupted ? colors.textMuted : colors.text}
      wrapMode="word"
      width="100%"
    >
      {text}
      {showCursor ? "▋" : ""}
    </text>
  );
}

export function BotMessage({
  parts,
  model,
  mode,
  duration,
  streaming = false,
  interrupted = false,
}: Props) {
  const { width } = useTerminalDimensions();
  const { colors } = useTheme();

  const boxWidth = Math.min(Math.max(width - 16, 52), 76);

  const modeColor = mode === Mode.BUILD ? colors.success : colors.primary;
  const accentColor = interrupted ? colors.error : modeColor;
  const borderColor = interrupted ? colors.error : colors.borderSoft;

  const hasText = parts.some((p) => p.type === "text" && p.text.length > 0);
  const hasParts = parts.length > 0;
  const isEmptyStreaming = streaming && !hasParts;
  const isEmptyInterrupted = interrupted && !hasParts;

  // Blink lives in a leaf — still causes BotMessage re-render via parent state.
  // Prefer a static cursor while tools dominate to cut scrollbox churn.
  const hasCallingTool = parts.some(
    (p) => p.type === "tool-call" && p.status === "calling",
  );
  const cursorVisible = useCursorBlink(streaming && hasText && !hasCallingTool);

  const groups = groupConsecutiveParts(parts);
  const lastTextGroupIndex = (() => {
    for (let i = groups.length - 1; i >= 0; i--) {
      if (groups[i]?.type === "text") return i;
    }
    return -1;
  })();

  return (
    <box flexDirection="row" width={boxWidth}>
      <box width={1} backgroundColor={accentColor} />

      <box
        flexGrow={1}
        flexDirection="column"
        border
        borderStyle="rounded"
        borderColor={borderColor}
        backgroundColor={colors.surface}
      >
        <box
          paddingX={2}
          paddingY={1}
          backgroundColor={colors.thinkingBorder}
          justifyContent="space-between"
          alignItems="center"
          flexDirection="row"
        >
          <box gap={1} flexDirection="row" alignItems="center">
            <text fg={interrupted ? colors.error : colors.primary}>
              {interrupted ? "◼" : streaming ? "✧" : "✦"}
            </text>
            <text fg={colors.text} attributes={TextAttributes.BOLD}>
              {model}
            </text>
          </box>

          <box gap={1} flexDirection="row" alignItems="center">
            <text
              fg={interrupted ? colors.error : modeColor}
              attributes={TextAttributes.BOLD}
            >
              {interrupted ? "Interrupted" : mode}
            </text>
            <text fg={colors.textMuted}>
              {interrupted
                ? " "
                : streaming
                  ? "streaming"
                  : duration
                    ? `• ${duration}`
                    : " "}
            </text>
          </box>
        </box>

        <box paddingX={2} paddingY={1} flexDirection="column" gap={1}>
          {isEmptyStreaming ? (
            <box flexDirection="row" gap={1} alignItems="center">
              <Spinner active />
              <text fg={colors.textMuted}>Working…</text>
            </box>
          ) : isEmptyInterrupted ? (
            <text fg={colors.textGhost} attributes={TextAttributes.DIM}>
              No response generated
            </text>
          ) : (
            groups.map((group, groupIndex) => {
              if (group.type === "reasoning") {
                const text = group.parts
                  .filter(
                    (p): p is Extract<ClientMessagePart, { type: "reasoning" }> =>
                      p.type === "reasoning",
                  )
                  .map((p) => p.text)
                  .join("");
                const isLastGroup = groupIndex === groups.length - 1;

                return (
                  <ReasoningBlock
                    key={group.key}
                    text={text}
                    streaming={streaming && isLastGroup}
                    colors={colors}
                  />
                );
              }

              if (group.type === "tool-call") {
                const tools = group.parts.filter(
                  (p): p is ClientToolCallPart => p.type === "tool-call",
                );
                return (
                  <ToolsBlock key={group.key} tools={tools} colors={colors} />
                );
              }

              const text = group.parts
                .filter(
                  (p): p is Extract<ClientMessagePart, { type: "text" }> =>
                    p.type === "text",
                )
                .map((p) => p.text)
                .join("");
              const showCursor =
                streaming &&
                cursorVisible &&
                groupIndex === lastTextGroupIndex;

              return (
                <TextBlock
                  key={group.key}
                  text={text}
                  showCursor={showCursor}
                  interrupted={interrupted}
                  colors={colors}
                />
              );
            })
          )}

          <box
            flexDirection="row"
            gap={1}
            alignItems="center"
            height={interrupted && hasParts ? 1 : 0}
          >
            <text fg={colors.error} attributes={TextAttributes.DIM}>
              {interrupted && hasParts ? "─" : " "}
            </text>
            <text fg={colors.textMuted} attributes={TextAttributes.DIM}>
              {interrupted && hasParts ? "stopped before completion" : " "}
            </text>
          </box>
        </box>
      </box>
    </box>
  );
}
