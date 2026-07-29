import { TextAttributes } from "@opentui/core";
import { useTerminalDimensions } from "@opentui/react";
import { useTheme } from "../../providers/theme";

type Props = {
  message: string;
  mode: string;
};

export function UserMessage({ message }: Props) {
  const { width } = useTerminalDimensions();
  const { colors } = useTheme();
  const boxWidth = Math.min(Math.max(width - 16, 52), 76);

  return (
    <box flexDirection="row" gap={1} width={boxWidth} paddingY={0}>
      <text fg={colors.primary} attributes={TextAttributes.BOLD}>
        ›
      </text>
      <box flexDirection="column" flexGrow={1} gap={0}>
        <text fg={colors.primary} attributes={TextAttributes.BOLD}>
          You
        </text>
        <text fg={colors.text} wrapMode="word" width="100%">
          {message}
        </text>
      </box>
    </box>
  );
}
