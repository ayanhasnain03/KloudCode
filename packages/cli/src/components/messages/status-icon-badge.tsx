import { TextAttributes } from "@opentui/core";
import { useTheme } from "../../providers/theme";

type Props = {
  icon: string;
  color: string;
};

export function StatusIconBadge({ icon, color }: Props) {
  const { colors } = useTheme();

  return (
    <box
      width={3}
      height={3}
      flexShrink={0}
      justifyContent="center"
      alignItems="center"
      backgroundColor={colors.dialogSurface}
      border
      borderStyle="rounded"
      borderColor={colors.border}
    >
      <text fg={color} attributes={TextAttributes.BOLD}>
        {icon}
      </text>
    </box>
  );
}
