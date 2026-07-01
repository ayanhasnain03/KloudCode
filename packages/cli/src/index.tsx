import { createCliRenderer } from "@opentui/core";
import { createRoot, useTerminalDimensions } from "@opentui/react";
import { Header } from "./components/header";
import { InputBar } from "./components/input-bar";
import { palette } from "./theme";

function App() {
  const { width } = useTerminalDimensions();
  const inputWidth = Math.min(Math.max(width - 16, 52), 76);

  return (
    <box
      flexGrow={1}
      backgroundColor={palette.void}
      justifyContent="center"
      alignItems="center"
    >
      <box flexDirection="column" alignItems="center" gap={4} width="100%" maxWidth={84}>
        <Header />
        <InputBar width={inputWidth} onSubmit={() => { }} />
      </box>
    </box>
  );
}

const renderer = await createCliRenderer({
  targetFps: 60,
  exitOnCtrlC: false
});

createRoot(renderer).render(<App />);
