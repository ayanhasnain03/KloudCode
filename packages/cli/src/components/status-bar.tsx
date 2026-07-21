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
    <box flexDirection="row" justifyContent="space-between" alignItems="center" width="100%">
      <box flexDirection="row" gap={1} alignItems="center">
        <text fg={colors.primary}>{mode}</text>
        <text fg={colors.textGhost} attributes={TextAttributes.DIM}>
          /
        </text>
        <text fg={colors.textMuted}>{model}</text>
      </box>

      {loading ? (
        <InputLoader />
      ) : (
        <text fg={colors.textGhost} attributes={TextAttributes.DIM}>
          ↵
        </text>
      )}
    </box>
  );
}
