import { TextAttributes } from "@opentui/core";
import { useTheme } from "../providers/theme";
import { InputLoader } from "./spinner";
import { usePromptConfig } from "../providers/prompt-config";
import { Mode } from "@kloud-code/database/enums";

interface Props {
  loading?: boolean;
}

function Hint({
  keys,
  label,
  keyColor,
  labelColor,
}: {
  keys: string;
  label: string;
  keyColor: string;
  labelColor: string;
}) {
  return (
    <box flexDirection="row" gap={1} alignItems="center">
      <text fg={keyColor} attributes={TextAttributes.BOLD}>
        {keys}
      </text>
      <text fg={labelColor}>{label}</text>
    </box>
  );
}

export function StatusBar({ loading = false }: Props) {
  const { mode, model } = usePromptConfig();
  const { colors } = useTheme();

  const isBuild = mode === Mode.BUILD;
  const modeColor = isBuild ? colors.primary : colors.planMode;
  const modeLabel = isBuild ? "build" : "plan";

  return (
    <box
      flexDirection="row"
      justifyContent="space-between"
      alignItems="center"
      width="100%"
    >
      <box flexDirection="row" gap={1} alignItems="center" flexShrink={0}>
        <text fg={modeColor} attributes={TextAttributes.BOLD}>
          {modeLabel}
        </text>
        <text fg={colors.textGhost}>/</text>
        <text fg={colors.textMuted}>{model}</text>
      </box>

      {loading ? (
        <box flexDirection="row" gap={1} alignItems="center" flexShrink={0}>
          <InputLoader />
          <text fg={colors.textMuted}>working</text>
          <text fg={colors.textGhost}>·</text>
          <Hint
            keys="esc"
            label="interrupt"
            keyColor={colors.error}
            labelColor={colors.textMuted}
          />
        </box>
      ) : (
        <box flexDirection="row" gap={2} alignItems="center" flexShrink={0}>
          <Hint
            keys="↵"
            label="send"
            keyColor={colors.textMuted}
            labelColor={colors.textDim}
          />
          <Hint
            keys="⇧↵"
            label="newline"
            keyColor={colors.textMuted}
            labelColor={colors.textDim}
          />
          <Hint
            keys="tab"
            label="mode"
            keyColor={colors.textMuted}
            labelColor={colors.textDim}
          />
        </box>
      )}
    </box>
  );
}
