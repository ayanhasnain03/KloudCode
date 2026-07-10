import "opentui-spinner/react";
import type { ColorGenerator } from "opentui-spinner";
import { useMemo } from "react";
import { useTheme } from "../providers/theme";
import type { ThemeColors } from "../theme";

/**
 * Holographic voxel — two glyphs phase-shift like a rotating energy cell.
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

export function Spinner() {
  const { colors } = useTheme();
  const color = useMemo(() => createVoxelColor(colors), [colors]);

  return (
    <spinner frames={[...VOXEL_FRAMES]} interval={75} color={color} />
  );
}

/** Inline loader — same slot as the submit hint. */
export function InputLoader() {
  return <Spinner />;
}
