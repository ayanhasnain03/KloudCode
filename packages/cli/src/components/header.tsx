import { TextAttributes } from "@opentui/core";
import { palette } from "../theme";

export function Header() {
  return (
    <box alignItems="center" gap={2} width="100%">
      <box flexDirection="row" gap={2} alignItems="center">
        <ascii-font font="tiny" text="Kloud" color={palette.copperLight} />
        <ascii-font font="tiny" text="Code" color={palette.platinum} />
      </box>

      <box flexDirection="row" gap={1} alignItems="center">
        <text fg="#27272A">
          ═══════════
        </text>

        <text fg="#F59E0B">
          ◈
        </text>

        <text fg="#E5E7EB">
          CODE • DEBUG • ARCHITECT
        </text>

        <text fg="#F59E0B">
          ◈
        </text>

        <text fg="#27272A">
          ═══════════
        </text>
      </box>

      <text fg={palette.silverMuted} attributes={TextAttributes.ITALIC}>
        Build APIs, fix bugs, review code, and ship faster.
      </text>
    </box>
  );
}
