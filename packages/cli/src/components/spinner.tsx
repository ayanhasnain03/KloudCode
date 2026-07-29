import "opentui-spinner/react";
import type { ColorGenerator } from "opentui-spinner";
import { useMemo } from "react";
import { TextAttributes } from "@opentui/core";
import { useTheme } from "../providers/theme";
import type { ThemeColors } from "../theme";

type SpinnerProps = {
  active?: boolean;
};

/**
 * Holographic voxel — two glyphs phase-shift like a rotating energy cell.
 * Fixed 2-cell width so idle/loading never remounts siblings next to the textarea.
 */
const VOXEL_FRAMES = [
  "▖▗",
  "▝▛",
  "▜▘",
  "▞▚",
  "▚▞",
  "▘▜",
  "▛▝",
  "▗▖",
] as const;

function createVoxelColor(colors: ThemeColors): ColorGenerator {
  const palette = [
    colors.textGhost,
    colors.textDim,
    colors.thinking,
    colors.primary,
    colors.thinking,
    colors.textDim,
  ];

  return (frameIndex, charIndex) =>
    palette[(frameIndex + charIndex) % palette.length] ?? colors.primary;
}

export function Spinner({ active = true }: SpinnerProps) {
  const { colors } = useTheme();
  const color = useMemo(() => {
    if (!active) return colors.surface;
    return createVoxelColor(colors);
  }, [active, colors]);

  return (
    <box width={2} height={1} flexShrink={0}>
      <spinner
        frames={[...VOXEL_FRAMES]}
        interval={75}
        autoplay={active}
        color={color}
      />
    </box>
  );
}

type LoadingPanelProps = {
  message?: string;
  /** Kept for call-site compatibility; both use the voxel spinner. */
  variant?: "orbit" | "ring";
};

/** Centered loading panel for dialogs and empty session shells. */
export function LoadingPanel({
  message = "Loading…",
}: LoadingPanelProps) {
  const { colors } = useTheme();

  return (
    <box
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      gap={1}
      paddingY={2}
      width="100%"
    >
      <Spinner active />
      <text attributes={TextAttributes.DIM} fg={colors.textMuted}>
        {message}
      </text>
    </box>
  );
}
