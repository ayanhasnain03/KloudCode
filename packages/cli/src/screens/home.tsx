import {
  useCallback,
} from "react"

import { useNavigate } from "react-router"

import { Header } from "../components/header"
import { useTerminalDimensions } from "@opentui/react"
import { InputBar } from "../components/input-bar"
import { usePromptConfigActions } from "../providers/prompt-config"

export function Home() {
  const navigate = useNavigate();
  const { getMode } = usePromptConfigActions();
  const { width } = useTerminalDimensions();
  const inputWidth = Math.min(Math.max(width - 16, 52), 76);
  // use for navigation to the new session page with the message
  const handleSubmit = useCallback((text: string) => {
    navigate("/sessions/new", {
      state: {
        message: text,
        mode: getMode(),
      }
    });
  }, [navigate, getMode]);

  return (
    <box
      alignItems="center"
      justifyContent="center"
      flexGrow={1}
      gap={2}
      position="relative"
      width="100%"
      height="100%"
    >
      <Header />
      <box width="100%" maxWidth={84} >
        <InputBar width={inputWidth} onSubmit={handleSubmit} />
      </box>


    </box>
  )

}
