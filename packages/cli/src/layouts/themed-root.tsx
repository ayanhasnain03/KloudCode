import { useTerminalDimensions } from "@opentui/react";
import { useTheme } from "../providers/theme";
import { Header } from "../components/header";
import { InputBar } from "../components/input-bar";
type Props = {
  children: React.ReactNode;
}
export function ThemedRoot({ children }: Props) {
  const { colors } = useTheme();
  const { width } = useTerminalDimensions();
  const inputWidth = Math.min(Math.max(width - 16, 52), 76);

  return (
    <box
      flexGrow={1}
      backgroundColor={colors.background}
      justifyContent="center"
      alignItems="center"
    >
      <box flexDirection="column" alignItems="center" gap={4} width="100%" maxWidth={84}>
        {children}
      </box>
    </box>
  )
}
