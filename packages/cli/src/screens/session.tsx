import { useLocation, useNavigate, useParams } from "react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { useChat, type Message, type ClientMessagePart } from "../hooks/use-chat";
import pretryMs from "pretty-ms"
import { messagePartsSchema, type SupportedChatModelId } from "@kloud-code/shared";
import { useKeyboard } from "@opentui/react";
import { MessageStatus } from "@kloud-code/database";
import { Mode } from "@kloud-code/database/enums";
import { useKeyboardLayer } from "../providers/keyboard-layer";
import { writeLastSessionId, clearLastSessionId } from "../lib/last-session";
import { LoadingPanel } from "../components/spinner";

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

    const parsedParts = m.parts === null ? null : messagePartsSchema.safeParse(m.parts);
    const parts: ClientMessagePart[] = parsedParts?.success ? parsedParts.data.map((p): ClientMessagePart => {
      if (p.type === "tool-call") {
        return {
          ...p,
          status: "done" as const
        }
      }
      return p;
    }) : [];
    return {
      id: m.id,
      role: "assistant",
      content: m.content,
      model: m.model as SupportedChatModelId,
      mode: m.mode,
      parts: parts,
      ...(m.duration != null ? { duration: pretryMs(m.duration * 1000) } : {}),
      interrupted: m.status === MessageStatus.INTERRUPTED
    }
  }


  )
}
const sessionLocationSchema = z.object({
  session: z.custom<SessionData>((val) => val != null && typeof val === "object" && "id" in val && typeof val.id === "string"),
})


function ChatMessage({
  msg,
  streamingParts,
}: {
  msg: Message
  streamingParts?: ClientMessagePart[]
}) {
  if (msg.role === "user") {
    return <UserMessage message={msg.content} mode={msg.mode} />
  }

  if (msg.role === "error") {
    return <ErrorMessage message={msg.content} />
  }

  const isLive = streamingParts != null;
  return (
    <BotMessage
      parts={isLive ? streamingParts : msg.parts}
      model={msg.model}
      mode={msg.mode}
      duration={isLive ? undefined : msg.duration}
      streaming={isLive}
      interrupted={isLive ? false : msg.interrupted}
    />
  )
}


function SessionChats({
  session,
}: {
  session: SessionData
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

  const handleSubmit = useCallback((
    text: string,
    mode: Mode,
    model: SupportedChatModelId,
  ) => {
    submit({
      userText: text,
      mode,
      model,
    });
  }, [submit]);

  const isStreaming = streaming.status === "streaming";

  return (
    <SessionShell onSubmit={handleSubmit} loading={isStreaming}>
      {
        messages.map((msg) => (
          <ChatMessage
            key={msg.id}
            msg={msg}
            streamingParts={
              isStreaming && streaming.messageId === msg.id
                ? streaming.parts
                : undefined
            }
          />
        ))
      }
    </SessionShell>
  )
}





export function Session() {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const toast = useToast();
  const navigate = useNavigate();
  const toastRef = useRef(toast);
  const navigateRef = useRef(navigate);
  toastRef.current = toast;
  navigateRef.current = navigate;

  const prefetched = useMemo(() => {
    const parsed = sessionLocationSchema.safeParse(location.state);
    return parsed.success ? parsed.data.session : null;
  }, [location.state]);

  const [session, setSession] = useState<SessionData | null>(prefetched);

  useEffect(() => {
    if (id) writeLastSessionId(id);
  }, [id]);

  useEffect(() => {
    if (prefetched) {
      setSession(prefetched);
      return;
    }

    if (!id) {
      setSession(null);
      return;
    }

    // Only clear when switching sessions — keep current UI while refetching.
    setSession((current) => (current?.id === id ? current : null));

    let ignore = false;

    const fetchSession = async () => {
      try {
        const res = await apiClient.sessions[":id"]["$get"]({ param: { id } });
        if (!res.ok) {
          throw new Error(await getErrorMessage(res));
        }
        const next = await res.json();
        if (ignore) return;
        setSession(next);
      } catch (error) {
        if (ignore) return;
        toastRef.current.show({
          variant: "error",
          message: error instanceof Error ? error.message : "An unexpected error occurred",
        });
        setSession((current) => {
          // Stay put if the chat is already on screen (e.g. transient error mid-task).
          if (current) return current;
          // Cold start with a stale last-session id — go home cleanly.
          clearLastSessionId();
          navigateRef.current("/", { replace: true });
          return null;
        });
      }
    }
    fetchSession();
    return () => {
      ignore = true;
    }
  }, [id, prefetched]);


  if (!session) {
    return (
      <SessionShell onSubmit={() => { }} inputDisabled={true}>
        <LoadingPanel message="Opening session…" />
      </SessionShell>
    );
  }

  return (
    <SessionChats key={session.id} session={session} />
  )
}
