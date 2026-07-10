import { TextAttributes } from "@opentui/core";
import { useTerminalDimensions } from "@opentui/react";
import { useTheme } from "../../providers/theme";
import { toastIcons, toastLabels } from "../../theme";
import { StatusIconBadge } from "./status-icon-badge";

type Props = {
  message: string;
};

export function ErrorMessage({ message }: Props) {
  const { width } = useTerminalDimensions();
  const { colors } = useTheme();
  const icon = toastIcons.error;
  const label = toastLabels.error;
  const boxWidth = Math.min(Math.max(width - 16, 52), 76);

  return (
    <box flexDirection="row" width={boxWidth}>
      <box width={1} backgroundColor={colors.error} />

      <box
        flexGrow={1}
        flexDirection="row"
        gap={1}
        alignItems="flex-start"
        paddingX={2}
        paddingY={1}
        backgroundColor={colors.surface}
        border
        borderStyle="rounded"
        borderColor={colors.borderSoft}
      >
        <StatusIconBadge icon={icon} color={colors.error} />

        <box flexDirection="column" flexGrow={1} gap={0}>
          <text fg={colors.error} attributes={TextAttributes.BOLD}>
            {label}
          </text>
          <text fg={colors.text} wrapMode="word" width="100%">
            {message}
          </text>
        </box>
      </box>
    </box>
  );
}
