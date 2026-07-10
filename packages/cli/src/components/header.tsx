import { TextAttributes } from "@opentui/core";
import { useTheme } from "../providers/theme";

export function Header() {
  const { colors } = useTheme();

  return (
    <box alignItems="center" gap={2} width="100%">
      <box flexDirection="row" gap={2} alignItems="center">
        <ascii-font font="tiny" text="Kloud" color={colors.accent} />
        <ascii-font font="tiny" text="Code" color={colors.text} />
      </box>

      <box flexDirection="row" gap={1} alignItems="center">
        <text fg={colors.borderSoft}>
          ═══════════
        </text>

        <text fg={colors.primary}>
          ◈
        </text>

        <text fg={colors.text}>
          CODE • DEBUG • ARCHITECT
        </text>

        <text fg={colors.primary}>
          ◈
        </text>

        <text fg={colors.borderSoft}>
          ═══════════
        </text>
      </box>

      <text fg={colors.textDim} attributes={TextAttributes.ITALIC}>
        Build APIs, fix bugs, review code, and ship faster.
      </text>
    </box>
  );
}
