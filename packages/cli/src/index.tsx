import { createCliRenderer } from "@opentui/core";
import { createRoot, useTerminalDimensions } from "@opentui/react";
import { Header } from "./components/header";
import { InputBar } from "./components/input-bar";
import { ToastProvider } from "./providers/toast";
import { KeyboardLayerProvider } from "./providers/keyboard-layer";
import { DialogProvider } from "./providers/dialog";
import { ThemeProvider, useTheme } from "./providers/theme";
function ThemedRoot() {
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
        <Header />
        <InputBar width={inputWidth} onSubmit={() => { }} />
      </box>
    </box>
  )
}
function App() {

  return (
    <ThemeProvider>
      <KeyboardLayerProvider>
        <DialogProvider>
          <ToastProvider>
            <ThemedRoot />
          </ToastProvider>
        </DialogProvider>
      </KeyboardLayerProvider>
    </ThemeProvider>
  );
}

const renderer = await createCliRenderer({
  targetFps: 60,
  exitOnCtrlC: false
});

createRoot(renderer).render(<App />);
