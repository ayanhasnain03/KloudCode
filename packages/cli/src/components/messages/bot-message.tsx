
import { useTerminalDimensions } from "@opentui/react";
import { useTheme } from "../../providers/theme";
import { toastIcons } from "../../theme";
import { StatusIconBadge } from "./status-icon-badge";
import { TextAttributes } from "@opentui/core";

type Props = {
  content: string;
  model: string;
};

export function BotMessage({ content, model }: Props) {
  const { width } = useTerminalDimensions();
  const { colors } = useTheme();
  const icon = toastIcons.info;
  const boxWidth = Math.min(Math.max(width - 16, 52), 76);

  return (
    <box flexDirection="column" width={boxWidth}>
      {/* Header */}
      <box
        paddingX={2}
        paddingY={1}
        backgroundColor={colors.thinkingBorder}
        gap={1}
        flexDirection="row"
        alignItems="center"
      >
        <text fg={colors.primary}>✦</text>
        <text attributes={TextAttributes.BOLD} fg={colors.text}>
          {model}
        </text>
      </box>

      {/* Message */}
      <box
        paddingX={2}
        paddingY={1}
        backgroundColor={colors.info}
      >
        <text fg={colors.text}>{content}</text>
      </box>
    </box>
  );
}
