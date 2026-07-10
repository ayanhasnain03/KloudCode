import {
  useEffect
} from "react"
import { useNavigate, useLocation } from "react-router";
import { useTheme } from "../providers/theme";
import { TextAttributes } from "@opentui/core";
import { ErrorMessage } from "../components/messages/error-message";
import { UserMessage } from "../components/messages/user-message";
import { BotMessage } from "../components/messages/bot-message";
import { SessionShell } from "../components/session-shell";
export function NewSession() {
  const navigate = useNavigate();
  const location = useLocation();
  const { colors } = useTheme();

  const state = location.state as { message?: string } | null;

  useEffect(() => {
    if (!state?.message) {
      navigate("/", { replace: true });
    }
  }, [navigate, state]);

  return (
    <SessionShell onSubmit={() => { }} inputDisabled={false} loading={true}>
      <UserMessage message={state?.message ?? ""} />
      <BotMessage content="This is a sample bot response to demonstrate the session shell component." model="gpt-4o" />
      <ErrorMessage message="This is a sample error message to demonstrate the session shell component." />
    </SessionShell>
  )

}
