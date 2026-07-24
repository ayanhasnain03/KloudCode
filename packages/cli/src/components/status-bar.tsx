import { TextAttributes } from "@opentui/core";
import { useTheme } from "../providers/theme";
import { InputLoader } from "./spinner";

type Props = {
  model?: string;
  mode?: string;
  loading?: boolean;
};

export function StatusBar({
  model = "opus-4-6",
  mode = "Build",
  loading = false,
}: Props) {
  const { colors } = useTheme();

  return (
    <box
      flexDirection="row"
      justifyContent="space-between"
      alignItems="center"
      width="100%"
    >
      {/* Left — active mode / model */}
      <box flexDirection="row" gap={1} alignItems="center">
        <text fg={colors.primary} attributes={TextAttributes.BOLD}>
        </text>
        <text fg={colors.textGhost} attributes={TextAttributes.DIM}>
          /
        </text>
        <text fg={colors.textMuted}>{model}</text>
      </box>

      {/* Right — live status or key hints */}
      {loading ? (
        <box flexDirection="row" gap={1} alignItems="center">
          <InputLoader />
          <text fg={colors.text} attributes={TextAttributes.BLINK}>
            ·
          </text>
          <text fg={colors.error} attributes={TextAttributes.BOLD}>
            esc
          </text>
          <text fg={colors.textMuted} attributes={TextAttributes.DIM}>
            to interrupt
          </text>
        </box>
      ) : (
        <box flexDirection="row" gap={1} alignItems="center">
          <text fg={colors.text} attributes={TextAttributes.BOLD}>↵</text>
          <text fg={colors.text} attributes={TextAttributes.BOLD}>
            send
          </text>
          <text fg={colors.text} attributes={TextAttributes.BOLD}>⇧↵</text>
          <text fg={colors.text} attributes={TextAttributes.BOLD}>
            newline
          </text>
        </box>
      )}
    </box>
  );
}
