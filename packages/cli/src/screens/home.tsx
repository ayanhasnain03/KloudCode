import {
  useCallback,
} from "react"

import { useNavigate } from "react-router"

import { Header } from "../components/header"
import { useTerminalDimensions } from "@opentui/react"
import { InputBar } from "../components/input-bar"

export function Home() {
  const navigate = useNavigate();
  const { width } = useTerminalDimensions();
  const inputWidth = Math.min(Math.max(width - 16, 52), 76);
  // use for navigation to the new session page with the message
  const handleSubmit = useCallback((text: string) => {
    navigate("/sessions/new", {
      state: {
        message: text,
        mode: "BUILD",
      }
    });
  }, [navigate]);

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
