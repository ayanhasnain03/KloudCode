import { useLocation, useNavigate, useParams } from "react-router";
import { useEffect, useMemo, useState } from "react";
import {
  BotMessage,
  UserMessage,
  ErrorMessage,
} from "../components/messages";
import type { InferResponseType } from "hono";
import { apiClient } from "../lib/api-client";
import z from "zod";
import { useToast } from "../providers/toast";
import { getErrorMessage } from "../lib/http-errors";
import { SessionShell } from "../components/session-shell";

type SessionData = InferResponseType<typeof apiClient.sessions[":id"]["$get"], 200>

const sessionLocationSchema = z.object({
  session: z.custom<SessionData>((val) => val != null && typeof val === "object" && "id" in val && typeof val.id === "string"),
})


function ChatMessage({ msg }: {
  msg: SessionData["messages"][number];
}) {
  if (msg.role === "USER") {
    return <UserMessage message={msg.content} mode={msg.mode} />
  }

  if (msg.role === "ERROR") {
    return <ErrorMessage message={msg.content} />
  }
  return <BotMessage content={msg.content} model={msg.model} />

}

export function Session() {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const toast = useToast();
  const navigate = useNavigate();

  const prefetched = useMemo(() => {
    const parsed = sessionLocationSchema.safeParse(location.state);
    return parsed.success ? parsed.data.session : null;
  }, [location.state]);

  const [session, setSession] = useState<SessionData | null>(prefetched);

  useEffect(() => {
    if (prefetched) return;

    setSession(null);

    if (!id) return;

    let ignore = false;

    const fetchSession = async () => {
      try {
        const res = await apiClient.sessions[":id"]["$get"]({ param: { id } });
        if (!res.ok) {
          throw new Error(await getErrorMessage(res));
        }
        const session = await res.json();
        if (ignore) return;
        setSession(session);
      } catch (error) {
        if (ignore) return;
        toast.show({
          variant: "error",
          message: error instanceof Error ? error.message : "An unexpected error occurred",
        });
        setSession(null);
        navigate("/", { replace: true });
      }
    }
    fetchSession();
    return () => {
      ignore = true;
    }
  }, [id, toast, prefetched, navigate]);


  if (!session) return <SessionShell onSubmit={() => { }} inputDisabled={true} />;

  return (
    <SessionShell onSubmit={() => { }}  >
      {
        session.messages?.map((msg) => (
          <ChatMessage key={msg.id} msg={msg} />
        ))
      }
    </SessionShell>
  )
}
