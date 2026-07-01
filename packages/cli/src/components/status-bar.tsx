import { TextAttributes } from "@opentui/core";
import { palette } from "../theme";

type Props = {
  model?: string;
  mode?: string;
};

export function StatusBar({ model = "opus-4-6", mode = "Build" }: Props) {
  return (
    <box flexDirection="row" justifyContent="space-between" alignItems="center" width="100%">
      <box flexDirection="row" gap={1} alignItems="center">
        <text fg={palette.copper}>{mode}</text>
        <text fg={palette.silverGhost} attributes={TextAttributes.DIM}>
          /
        </text>
        <text fg={palette.silver}>{model}</text>
      </box>

      <text fg={palette.silverGhost} attributes={TextAttributes.DIM}>
        ↵
      </text>
    </box>
  );
}
