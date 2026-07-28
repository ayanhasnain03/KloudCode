import {
  useState,
  useRef,
  useCallback,
  useEffect
} from "react";
import { EventSourceParserStream } from "eventsource-parser/stream";
import prettyMs from "pretty-ms";
import type { ClientResponse } from "hono/client";
import { apiClient } from "../lib/api-client";

import { getErrorMessage } from "../lib/http-errors";

import type { Mode } from "../../../database/generated/prisma/enums";

import {
  chatStreamEventSchema,
  type ChatStreamEvent,
  type SupportedChatModelId
}
  from "@kloud-code/shared";

// Batch streaming re-renders. Tool-heavy turns (bash installs) used to emit
// on every event and mount OpenTUI nodes until the process segfaulted.
const STREAM_EMIT_INTERVAL_MS = 150;

export type ClientMessagePart = {
  type: "text",
  text: string
} | {
  type: "reasoning";
  text: string;
} |
  ClientToolCallPart

export type ClientToolCallPart = {
  type: "tool-call";
  id: string;
  name: string;
  args: Record<string, unknown>;
  result?: string;
  status: "calling" | "done";
}


export type Message =
  | {
    id: string;
    role: "user";
    content: string;
    mode: Mode;
    model: SupportedChatModelId
  } | {
    id: string;
    role: "assistant";
    content: string;
    mode: Mode,
    model: SupportedChatModelId;
    parts: ClientMessagePart[];
    duration?: string;
    interrupted?: boolean;
  }
  | { id: string; role: "error", content: string };

type StreamingState =
  | { status: "idle" }
  | {
    status: "streaming";
    messageId: string;
    parts: ClientMessagePart[];
    mode: Mode;
    model: SupportedChatModelId
  };


type ActiveStream = {
  requestId: string;
  messageId: string;
  controller: AbortController;
  mode: Mode;
  model: SupportedChatModelId;
  parts: ClientMessagePart[];
  interruptedCaptured?: boolean;
}

type SubmitParams = {
  userText: string;
  mode: Mode;
  model: SupportedChatModelId;
};

type RunStreamParams = {
  mode: Mode;
  model: SupportedChatModelId;
  request: (controller: AbortController) => Promise<ClientResponse<unknown>>;
};


export function useChat(
  sessionId: string,
  initialMessages: Message[]
) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);

  const [streaming, setStreaming] = useState<StreamingState>({
    status: "idle"
  });

  const activeStreamRef = useRef<ActiveStream | null>(null);

  const updateMessages = useCallback((updater: (prev: Message[]) => Message[]) => {
    setMessages((prev) => updater(prev))
  }, []);

  const isActiveRequest = useCallback((requestId: string) => {
    return activeStreamRef.current?.requestId === requestId;
  }, []);

  // Deep-clone so React/OpenTUI always sees new part objects (not mutated refs).
  const snapshotParts = useCallback((parts: ClientMessagePart[]): ClientMessagePart[] => {
    return parts.map((p) => {
      if (p.type === "tool-call") {
        return { ...p, args: { ...p.args } };
      }
      return { ...p };
    });
  }, []);

  const emitParts = useCallback((
    requestId: string,
    parts: ClientMessagePart[]
  ) => {
    if (!isActiveRequest(requestId)) return;

    const snapshot = snapshotParts(parts);
    const activeStream = activeStreamRef.current;
    if (!activeStream) return;

    activeStream.parts = snapshot;
    setStreaming({
      status: "streaming",
      messageId: activeStream.messageId,
      parts: snapshot,
      mode: activeStream.mode,
      model: activeStream.model
    });

  }, [isActiveRequest, snapshotParts])

  const clearStream = useCallback((
    requestId: string
  ) => {
    if (!isActiveRequest(requestId)) return;
    activeStreamRef.current = null;
    setStreaming({
      status: "idle"
    })
  }, [isActiveRequest]);

  // Replace the in-list placeholder (same id/key) instead of unmounting a
  // streaming sibling and inserting a new row — that pattern crashes OpenTUI.
  const finishStreamWithMessage = useCallback((
    requestId: string,
    message: Message,
  ) => {
    if (!isActiveRequest(requestId)) return;
    const messageId = activeStreamRef.current?.messageId;
    activeStreamRef.current = null;
    // Update the message first; defer idle so StatusBar loading flip does not
    // reconcile in the same commit as the scrollbox finalize (segfaults OpenTUI).
    updateMessages((prev) => {
      if (messageId && prev.some((m) => m.id === messageId)) {
        return prev.map((m) => (m.id === messageId ? message : m));
      }
      return [...prev, message];
    });
    setTimeout(() => {
      setStreaming((prev) =>
        prev.status === "streaming" && prev.messageId === messageId
          ? { status: "idle" }
          : prev,
      );
    }, 50);
  }, [isActiveRequest, updateMessages]);

  const handleStream = useCallback(async (
    response: ClientResponse<unknown>,
    activeStream: ActiveStream
  ) => {
    if (!isActiveRequest(activeStream.requestId)) return;
    if (!response.ok) {
      const message = await getErrorMessage(response);
      // Keep assistant role so we don't unmount BotMessage → ErrorMessage (OpenTUI crash).
      finishStreamWithMessage(activeStream.requestId, {
        id: activeStream.messageId,
        role: "assistant",
        content: message,
        mode: activeStream.mode,
        model: activeStream.model,
        parts: [{ type: "text", text: message }],
        interrupted: true,
      });
      return;
    };

    const parts: ClientMessagePart[] = [];
    let lastEmitAt = 0;
    let finalized = false;
    let emitTimer: ReturnType<typeof setTimeout> | null = null;

    const flushEmit = () => {
      if (emitTimer) {
        clearTimeout(emitTimer);
        emitTimer = null;
      }
      lastEmitAt = Date.now();
      emitParts(activeStream.requestId, parts);
    };

    const scheduleEmit = () => {
      if (!isActiveRequest(activeStream.requestId)) return;
      const now = Date.now();
      const elapsed = now - lastEmitAt;
      if (elapsed >= STREAM_EMIT_INTERVAL_MS) {
        flushEmit();
        return;
      }
      if (emitTimer) return;
      emitTimer = setTimeout(() => {
        emitTimer = null;
        if (!isActiveRequest(activeStream.requestId) || finalized) return;
        flushEmit();
      }, STREAM_EMIT_INTERVAL_MS - elapsed);
    };

    const finalizeAssistant = (
      durationMs?: number,
      interrupted = false,
    ) => {
      if (finalized || !isActiveRequest(activeStream.requestId)) return;
      finalized = true;
      const fullText = parts
        .filter((p): p is Extract<ClientMessagePart, { type: "text" }> => p.type === "text")
        .map((p) => p.text)
        .join("");

      activeStream.parts = snapshotParts(parts);
      flushEmit();
      finishStreamWithMessage(activeStream.requestId, {
        id: activeStream.messageId,
        role: "assistant",
        content: fullText,
        mode: activeStream.mode,
        model: activeStream.model,
        ...(durationMs != null ? { duration: prettyMs(durationMs) } : {}),
        parts: snapshotParts(parts),
        ...(interrupted ? { interrupted: true } : {}),
      });
    };

    const stream = response
      .body!.pipeThrough(new TextDecoderStream())
      .pipeThrough(new EventSourceParserStream());
    try {
      for await (const { data } of stream as unknown as AsyncIterable<{ data: string }>) {
        if (!isActiveRequest(activeStream.requestId)) return;
        if (!data) continue;

        let parsed: ChatStreamEvent;
        try {
          parsed = chatStreamEventSchema.parse(JSON.parse(data));
        } catch (error) {
          const message = error instanceof Error ? error.message : "Invalid stream event";

          finishStreamWithMessage(activeStream.requestId, {
            id: activeStream.messageId,
            role: "assistant",
            content: message,
            mode: activeStream.mode,
            model: activeStream.model,
            parts: [{ type: "text", text: message }],
            interrupted: true,
          });
          finalized = true;
          break;
        }

        const event = parsed;
        switch (event.type) {
          case "ping":
            // Keepalive from server during long bash/tool execution.
            break;
          case "text-delta": {
            const last = parts[parts.length - 1];
            if (last && last.type === "text") {
              last.text += event.text;
            } else {
              parts.push({
                type: "text",
                text: event.text
              })
            }
            scheduleEmit();
            break;
          }

          case "reasoning-delta": {
            const last = parts[parts.length - 1];
            if (last && last.type === "reasoning") {
              last.text += event.text;
            } else {
              parts.push({
                type: "reasoning",
                text: event.text
              })
            }
            scheduleEmit();
            break;
          }
          case "tool-call": {
            parts.push({
              type: "tool-call",
              id: event.toolCallId,
              name: event.toolName,
              args: event.args,
              status: "calling"
            })
            scheduleEmit();
            break;
          }
          case "tool-result": {
            const toolCallPart = parts.find((p): p is Extract<ClientMessagePart, { type: "tool-call" }> => p.type === "tool-call" && p.id === event.toolCallId);
            if (toolCallPart) {
              toolCallPart.result = event.result;
              toolCallPart.status = "done";
            }
            scheduleEmit();
            break;
          }
          case "done": {
            finalizeAssistant(event.durationMs, false);
            break
          }
          case "error": {
            finalized = true;
            if (emitTimer) {
              clearTimeout(emitTimer);
              emitTimer = null;
            }
            finishStreamWithMessage(activeStream.requestId, {
              id: activeStream.messageId,
              role: "assistant",
              content: event.message,
              mode: activeStream.mode,
              model: activeStream.model,
              parts: [{ type: "text", text: event.message }],
              interrupted: true,
            });
            break;
          }
        }
      }

      // Connection dropped mid-tool — keep work so far.
      if (!finalized && isActiveRequest(activeStream.requestId) && parts.length > 0) {
        finalizeAssistant(undefined, true);
      }
    } finally {
      if (emitTimer) {
        clearTimeout(emitTimer);
        emitTimer = null;
      }
    }
  }, [finishStreamWithMessage, emitParts, isActiveRequest, snapshotParts]);

  const runStream = useCallback(async (
    {
      mode,
      model,
      request
    }: RunStreamParams
  ) => {
    const controller = new AbortController();
    const messageId = crypto.randomUUID();
    const activeStream: ActiveStream = {
      requestId: crypto.randomUUID(),
      messageId,
      controller,
      mode,
      model,
      parts: [],
      interruptedCaptured: false,
    };

    activeStreamRef.current = activeStream;
    // Mount the assistant row once up front; stream updates reuse this id/key.
    updateMessages((prev) => [
      ...prev,
      {
        id: messageId,
        role: "assistant",
        content: "",
        mode,
        model,
        parts: [],
      },
    ]);
    setStreaming({
      status: "streaming",
      messageId,
      parts: [],
      mode,
      model
    })
    try {
      const response = await request(controller);
      await handleStream(response, activeStream);
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return;
      }
      if (!isActiveRequest(activeStream.requestId)) return;

      const msg = error instanceof Error ? error.message : String(error);

      finishStreamWithMessage(activeStream.requestId, {
        id: activeStream.messageId,
        role: "assistant",
        content: msg,
        mode: activeStream.mode,
        model: activeStream.model,
        parts: [{ type: "text", text: msg }],
        interrupted: true,
      });
    } finally {
      clearStream(activeStream.requestId)
    }

  }, [clearStream, finishStreamWithMessage, handleStream, isActiveRequest, updateMessages]);

  const stopActiveStream = useCallback((
    capturePartial: boolean,
  ) => {
    const activeStream = activeStreamRef.current;
    if (!activeStream) return;

    const shouldCapture =
      capturePartial &&
      !activeStream.interruptedCaptured &&
      activeStream.parts.length > 0;

    if (shouldCapture) {
      activeStream.interruptedCaptured = true;
    }

    const partialParts = shouldCapture ? snapshotParts(activeStream.parts) : null;
    const { mode, model, controller, messageId } = activeStream;

    activeStreamRef.current = null;
    setStreaming({ status: "idle" });
    controller.abort();

    if (partialParts) {
      const fullText = partialParts
        .filter((p): p is Extract<ClientMessagePart, { type: "text" }> => p.type === "text")
        .map((p) => p.text)
        .join("");

      updateMessages((prev) =>
        prev.map((m) =>
          m.id === messageId
            ? {
              id: messageId,
              role: "assistant" as const,
              content: fullText,
              mode,
              model,
              parts: partialParts,
              interrupted: true
            }
            : m
        )
      );
    } else {
      // Drop the empty placeholder when aborting with nothing to keep.
      updateMessages((prev) => prev.filter((m) => m.id !== messageId));
    }
  }, [snapshotParts, updateMessages])

  const resume = useCallback(async ({
    mode, model
  }: Omit<SubmitParams, "userText">) => {
    await runStream({
      mode,
      model,
      request: async (controller) => {
        return apiClient.chat[":sessionId"].resume.$post({
          param: {
            sessionId
          },
        },
          { init: { signal: controller.signal } }
        )
      }
    })
  }, [runStream, sessionId]);

  const hasAutoResumedRef = useRef(false);
  useEffect(() => {
    if (hasAutoResumedRef.current) return;
    const last = initialMessages[initialMessages.length - 1];
    if (!last || last.role !== "user") return;
    hasAutoResumedRef.current = true;
    void resume({
      mode: last.mode,
      model: last.model
    });
  }, [initialMessages, resume])

  const submit = useCallback(async ({
    userText,
    mode,
    model
  }: SubmitParams) => {
    stopActiveStream(true);

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: userText,
      mode,
      model
    };
    updateMessages((prev) => [
      ...prev,
      userMessage
    ]);

    await runStream({
      mode,
      model,
      request: async (controller) => {
        return apiClient.chat[":sessionId"].$post({
          param: { sessionId },
          json: {
            content: userText, mode, model
          },
        },
          { init: { signal: controller.signal } }
        )
      }
    });
  }, [runStream, sessionId, updateMessages, stopActiveStream]);

  const abort = useCallback(() => {
    stopActiveStream(false);
  }, [stopActiveStream]);

  const interrupt = useCallback(() => {
    stopActiveStream(true);
  }, [stopActiveStream]);

  return { messages, streaming, submit, abort, interrupt };
}
