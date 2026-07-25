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
import { useChat, type Message } from "../hooks/use-chat";
import pretryMs from "pretty-ms"
import { type SupportedChatModelId } from "@kloud-code/shared";
import { useKeyboard } from "@opentui/react";
import { MessageStatus, Mode } from "@kloud-code/database";
import { useKeyboardLayer } from "../providers/keyboard-layer";
import { usePromptConfig } from "../providers/prompt-config";

type SessionData = InferResponseType<typeof apiClient.sessions[":id"]["$get"], 200>
function mapDbMessages(dbMessages: SessionData["messages"]): Message[] {
  return dbMessages.map((m): Message => {
    if (m.role === "ERROR") {
      return {
        id: m.id,
        role: "error",
        content: m.content
      }
    }
    if (m.role === "USER") {
      return {
        id: m.id,
        role: "user",
        content: m.content,
        mode: m.mode,
        model: m.model as SupportedChatModelId
      }
    }
    return {
      id: m.id,
      role: "assistant",
      content: m.content,
      model: m.model as SupportedChatModelId,
      mode: m.mode,
      parts: [{
        type: "text",
        text: m.content
      }],
      ...(m.duration != null ? { duration: pretryMs(m.duration * 1000) } : {}),
      interrupted: m.status === MessageStatus.INTERRUPTED
    }
  }


  )
}
const sessionLocationSchema = z.object({
  session: z.custom<SessionData>((val) => val != null && typeof val === "object" && "id" in val && typeof val.id === "string"),
})


function ChatMessage({ msg }: {
  msg: Message
}) {
  if (msg.role === "user") {
    return <UserMessage message={msg.content} mode={msg.mode} />
  }

  if (msg.role === "error") {
    return <ErrorMessage message={msg.content} />
  }
  return <BotMessage parts={msg.parts} model={msg.model} mode={msg.mode} duration={msg.duration} streaming={false} interrupted={msg.interrupted} />
}


function SessionChats({
  session,
  mode,
  model
}: {
  session: SessionData
  mode: Mode
  model: SupportedChatModelId
}) {
  const [initialMessages] = useState(() => mapDbMessages(session.messages));

  const { isTopLayer } = useKeyboardLayer();



  const { messages, streaming, submit, abort, interrupt } = useChat(session.id, initialMessages);

  useEffect(() => {
    return () => abort()
  }, [abort])


  useKeyboard((key) => {
    if (key.name === "escape" && isTopLayer("base") && streaming.status === "streaming") {
      key.preventDefault();
      interrupt();
    }
  })



  return (
    <SessionShell onSubmit={(text) => {
      submit({
        userText: text,
        mode: mode,
        model: model
      })
    }} loading={streaming.status === "streaming"}>
      {
        messages.map((msg) => (
          <ChatMessage key={msg.id} msg={msg} />
        ))
      }
      {
        streaming.status === "streaming" && (
          <BotMessage
            parts={streaming.parts}
            model={streaming.model}
            mode={streaming.mode}
            streaming
          />
        )
      }
    </SessionShell>
  )
}





export function Session() {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const toast = useToast();
  const navigate = useNavigate();
  const { mode, model } = usePromptConfig();
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
  }, [id, toast, prefetched, navigate, mode, model]);


  if (!session) return <SessionShell onSubmit={() => { }} inputDisabled={true} />;

  return (
    <SessionChats key={session.id} session={session} mode={mode} model={model} />
  )
}
