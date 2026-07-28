import { useMemo } from "react";
import { TextAttributes } from "@opentui/core";
import { createPulse, createWave } from "opentui-spinner";
import "opentui-spinner/react";
import { useTheme } from "../providers/theme";

type SpinnerProps = {
  active?: boolean;
};

/**
 * Soft orbit — fixed 3-cell width so idle/loading never remounts siblings.
 * Animation runs inside SpinnerRenderable (no React timer), which is safe
 * next to the focused textarea.
 */
const ORBIT_FRAMES = ["●○○", "○●○", "○○●", "○●○"] as const;

/** Wider pulse bar for centered dialog / panel loaders. */
const BAR_FRAMES = ["▰▱▱▱", "▱▰▱▱", "▱▱▰▱", "▱▱▱▰", "▱▱▰▱", "▱▰▱▱"] as const;

type OrbitSpinnerProps = SpinnerProps & {
  /** Slightly slower / softer for status-bar chrome. */
  compact?: boolean;
};

function OrbitSpinner({ active = true, compact = false }: OrbitSpinnerProps) {
  const { colors } = useTheme();

  const color = useMemo(() => {
    if (!active) return colors.surface;
    return createWave([colors.primary, colors.selection, colors.primary]);
  }, [active, colors.primary, colors.selection, colors.surface]);

  return (
    <box width={3} height={1} flexShrink={0}>
      <spinner
        frames={[...ORBIT_FRAMES]}
        interval={compact ? 160 : 140}
        autoplay={active}
        color={color}
      />
    </box>
  );
}

/**
 * Status-bar / input-adjacent loader. Always mounted at fixed width —
 * only props flip; never swap the subtree.
 */
export function InputLoader({ active = true }: SpinnerProps) {
  return <OrbitSpinner active={active} compact />;
}

/** Standalone glyph for dialogs and inline message states. */
export function Spinner({ active = true }: SpinnerProps) {
  const { colors } = useTheme();

  const color = useMemo(() => {
    if (!active) return colors.textGhost;
    return createPulse([colors.primary, colors.selection, colors.primary], 0.7);
  }, [active, colors.primary, colors.selection, colors.textGhost]);

  return (
    <box width={1} height={1} flexShrink={0}>
      <spinner
        name="dots"
        interval={80}
        autoplay={active}
        color={color}
      />
    </box>
  );
}

type LoadingPanelProps = {
  message?: string;
  /** Use the wider bar animation (dialogs / empty scroll areas). */
  variant?: "orbit" | "bar";
};

/** Centered premium loading panel for dialogs and empty session shells. */
export function LoadingPanel({
  message = "Loading…",
  variant = "bar",
}: LoadingPanelProps) {
  const { colors } = useTheme();

  const color = useMemo(
    () => createPulse([colors.primary, colors.selection, colors.primary], 0.55),
    [colors.primary, colors.selection],
  );

  return (
    <box
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      gap={1}
      paddingY={2}
      width="100%"
    >
      {variant === "bar" ? (
        <box width={4} height={1} flexShrink={0}>
          <spinner
            frames={[...BAR_FRAMES]}
            interval={120}
            autoplay
            color={color}
          />
        </box>
      ) : (
        <OrbitSpinner active />
      )}
      <text attributes={TextAttributes.DIM} fg={colors.textMuted}>
        {message}
      </text>
    </box>
  );
}
