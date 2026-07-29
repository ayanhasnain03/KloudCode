import { TextAttributes } from "@opentui/core";
import { useTerminalDimensions } from "@opentui/react";
import { useTheme } from "../../providers/theme";

type Props = {
  message: string;
};

export function ErrorMessage({ message }: Props) {
  const { width } = useTerminalDimensions();
  const { colors } = useTheme();
  const boxWidth = Math.min(Math.max(width - 16, 52), 76);

  return (
    <box flexDirection="row" gap={1} width={boxWidth}>
      <text fg={colors.error} attributes={TextAttributes.BOLD}>
        ✕
      </text>
      <box flexDirection="column" flexGrow={1} gap={0}>
        <text fg={colors.error} attributes={TextAttributes.BOLD}>
          Error
        </text>
        <text fg={colors.text} wrapMode="word" width="100%">
          {message}
        </text>
      </box>
    </box>
  );
}
