import {
  useEffect,
  useMemo,
  useRef
} from "react"
import { z } from "zod";
import { useNavigate, useLocation } from "react-router";
import { UserMessage } from "../components/messages/user-message";
import { SessionShell } from "../components/session-shell";
import { useToast } from "../providers/toast";
import { apiClient } from "../lib/api-client";
import { getErrorMessage } from "../lib/http-errors";
import { usePromptConfig } from "../providers/prompt-config";



const newSessionSchema = z.object({
  message: z.string(),
  mode: z.string().default("BUILD"),
})



export function NewSession() {
  const { mode, model } = usePromptConfig();
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  const hasStartedRef = useRef(false);

  const state = useMemo(() => {
    const parsed = newSessionSchema.safeParse(location.state);
    return parsed.success ? parsed.data : null;
  }, [location.state]);

  // Guard: if navigated directly to this screen, redirect to home
  useEffect(() => {
    if (!state?.message) {
      navigate("/", { replace: true });
    }
  }, [navigate, state]);



  // create the session on mount

  useEffect(() => {
    if (!state || hasStartedRef.current) return;
    hasStartedRef.current = true;
    let ignore = false;

    const createSession = async () => {
      try {
        const res = await apiClient.sessions.$post({
          json: {
            title: state.message.slice(0, 100),
            cwd: process.cwd(),
            initialMessage: {
              role: "USER",
              content: state.message,
              mode: mode,
              model: model,
            }
          }
        })
        if (ignore) return;

        if (!res.ok) {
          throw new Error(await getErrorMessage(res));
        }
        const session = await res.json();
        navigate(`/sessions/${session.id}`, { replace: true, state: { session } });
      } catch (error) {
        if (ignore) return;
        toast.show({
          variant: "error",
          message: error instanceof Error ? error.message : "An unexpected error occurred",
        });
        navigate("/", { replace: true });
      }
    }
    createSession();
    return () => {
      ignore = true;
    }
  }, [state, toast, navigate, mode, model]);

  if (!state) return null;

  return (
    <SessionShell onSubmit={() => { }} inputDisabled={false} loading={true}>
      <UserMessage message={state.message} mode={state.mode} />
    </SessionShell>
  )

}
