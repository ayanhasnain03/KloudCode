import { TextAttributes } from "@opentui/core";
import { useTheme } from "../providers/theme";
import {
  usePromptConfigMode,
  usePromptConfigModel,
} from "../providers/prompt-config";
import { useSessionLoading } from "../providers/session-loading";
import { Mode } from "@kloud-code/database/enums";

interface Props {
  /** Optional override; defaults to session streaming status via context. */
  loading?: boolean;
}

type HintSlot = {
  keys: string;
  label: string;
  keyColor: string;
  labelColor: string;
};

// The number of hint slots never changes. Mounting or unmounting nodes next
// to the focused textarea is what crashes OpenTUI, so idle/loading states
// swap text content in a fixed tree instead of swapping subtrees.
const HINT_SLOT_COUNT = 3;

function Hint({ keys, label, keyColor, labelColor }: HintSlot) {
  return (
    <box flexDirection="row" gap={1} alignItems="center">
      <text fg={keyColor} attributes={TextAttributes.BOLD}>
        {keys}
      </text>
      <text fg={labelColor}>{label}</text>
    </box>
  );
}

export function StatusBar({ loading: loadingProp }: Props) {
  const sessionLoading = useSessionLoading();
  const loading = loadingProp ?? sessionLoading;
  const mode = usePromptConfigMode();
  const model = usePromptConfigModel();
  const { colors } = useTheme();

  const isBuild = mode === Mode.BUILD;
  const blank: HintSlot = {
    keys: "",
    label: "",
    keyColor: colors.textMuted,
    labelColor: colors.textDim,
  };

  const hints: HintSlot[] = loading
    ? [
      {
        keys: "",
        label: "working",
        keyColor: colors.primary,
        labelColor: colors.textMuted,
      },
      {
        keys: "esc",
        label: "interrupt",
        keyColor: colors.error,
        labelColor: colors.textMuted,
      },
    ]
    : [
      {
        keys: "↵",
        label: "send",
        keyColor: colors.textMuted,
        labelColor: colors.textDim,
      },
      {
        keys: "⇧↵",
        label: "newline",
        keyColor: colors.textMuted,
        labelColor: colors.textDim,
      },
      {
        keys: "tab",
        label: "mode",
        keyColor: colors.textMuted,
        labelColor: colors.textDim,
      },
    ];

  return (
    <box
      flexDirection="row"
      justifyContent="space-between"
      alignItems="center"
      width="100%"
    >
      <box flexDirection="row" gap={1} alignItems="center" flexShrink={0}>
        <text
          fg={isBuild ? colors.primary : colors.planMode}
          attributes={TextAttributes.BOLD}
        >
          {isBuild ? "build" : "plan"}
        </text>
        <text fg={colors.textGhost}>/</text>
        <text fg={colors.textMuted}>{model}</text>
      </box>

      <box flexDirection="row" gap={2} alignItems="center" flexShrink={0}>
        {Array.from({ length: HINT_SLOT_COUNT }, (_, slot) => (
          <Hint key={`hint-${slot}`} {...(hints[slot] ?? blank)} />
        ))}
      </box>
    </box>
  );
}
