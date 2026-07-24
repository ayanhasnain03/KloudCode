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

// Batch streaming re-renders to ~30fps so the terminal repaints smoothly
// instead of thrashing once per streamed token.
const STREAM_EMIT_INTERVAL_MS = 32;

export type ClientMessagePart = {
  type: "text",
  text: string
};


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
    duration?: string
  }
  | { id: string; role: "error", content: string };

type StreamingState =
  | { status: "idle" }
  | {
    status: "streaming";
    parts: ClientMessagePart[];
    mode: Mode;
    model: SupportedChatModelId
  };


type ActiveStream = {
  requestId: string; // unique identifier for the active stream
  controller: AbortController; // controller to abort the stream
  mode: Mode;
  model: SupportedChatModelId;
  parts: ClientMessagePart[]
}

type SubmitParams = {
  userText: string;
  mode: Mode;
  model: SupportedChatModelId;
};

type RunStreamParams = {
  mode: Mode;
  model: SupportedChatModelId;
  request: (controller: AbortController) => Promise<ClientResponse<unknown>>; // request to the API to stream the response
};


export function useChat(
  sessionId: string,
  initialMessages: Message[]
) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);

  const [streaming, setStreaming] = useState<StreamingState>({
    status: "idle"
  });

  const activeStreamRef = useRef<ActiveStream | null>(null); // reference to the active stream

  const updateMessages = useCallback((updater: (prev: Message[]) => Message[]) => {
    setMessages((prev) => updater(prev))
  }, []);

  const isActiveRequest = useCallback((requestId: string) => {
    return activeStreamRef.current?.requestId === requestId;
  }, []);



  // emit the parts to the active stream to update the UI
  const emitParts = useCallback((
    requestId: string,
    parts: ClientMessagePart[]
  ) => {
    if (!isActiveRequest(requestId)) return;

    const snapshot = [...parts]; // create a snapshot of the parts to avoid mutating the original array
    const activeStream = activeStreamRef.current;
    if (!activeStream) return;

    activeStream.parts = snapshot; // update the active stream with the new parts
    setStreaming({
      status: "streaming",
      parts: snapshot,
      mode: activeStream.mode,
      model: activeStream.model
    });

  }, [isActiveRequest])


  const clearStream = useCallback((
    requestId: string
  ) => {
    if (!isActiveRequest(requestId)) return;
    activeStreamRef.current = null;
    setStreaming({
      status: "idle"
    })
  }, [isActiveRequest]);

  const handleStream = useCallback(async (
    response: ClientResponse<unknown>, // response from the API
    activeStream: ActiveStream // active stream to update the UI
  ) => {
    if (!isActiveRequest(activeStream.requestId)) return;
    if (!response.ok) {
      const message = await getErrorMessage(response);
      updateMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "error",
          content: message
        }
      ]);
      return;
    };

    const parts: ClientMessagePart[] = [];
    let lastEmitAt = 0;

    // pipe the response through the text decoder and the event source parser to get the events
    const stream = response
      .body!.pipeThrough(new TextDecoderStream())
      .pipeThrough(new EventSourceParserStream());
    for await (const { data } of stream as unknown as AsyncIterable<{ data: string }>) {
      if (!isActiveRequest(activeStream.requestId) || !data) return;

      let parsed: ChatStreamEvent;
      try {
        parsed = chatStreamEventSchema.parse(JSON.parse(data));
      } catch (error) {
        const message = error instanceof Error ? error.message : "Invalid stream event";

        updateMessages((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            role: "error",
            content: message
          }
        ]);
        break;
      }

      const event = parsed;
      switch (event.type) {
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
          // Throttle emits so the UI updates at a steady cadence rather than
          // re-rendering on every token. The first delta always paints
          // immediately (lastEmitAt starts at 0).
          const now = Date.now();
          if (now - lastEmitAt >= STREAM_EMIT_INTERVAL_MS) {
            lastEmitAt = now;
            emitParts(activeStream.requestId, parts);
          }
          break;
        }
        case "done": {
          if (!isActiveRequest(activeStream.requestId)) return;
          const fullText = parts
            .filter((p) => p.type === "text")
            .map((p) => p.text)
            .join("");

          updateMessages((prev) => [
            ...prev,
            {
              id: event.messageId,
              role: "assistant",
              content: fullText,
              mode: activeStream.mode,
              model: activeStream.model,
              duration: prettyMs(event.durationMs),
              parts: [...parts]
            }
          ]);
          break
        }
        case "error": {
          updateMessages((prev) => [
            ...prev,
            {
              id: crypto.randomUUID(),
              role: "error",
              content: event.message
            }
          ]);
          break;
        }
      }
    }
  }, [updateMessages, emitParts, isActiveRequest]);

  const runStream = useCallback(async (
    {
      mode,
      model,
      request
    }: RunStreamParams
  ) => {
    const controller = new AbortController();
    const activeStream: ActiveStream = {
      requestId: crypto.randomUUID(),
      controller,
      mode,
      model,
      parts: []
    };

    activeStreamRef.current = activeStream;
    setStreaming({
      status: "streaming",
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

      updateMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "error",
          content: msg
        }
      ]);
    } finally {
      clearStream(activeStream.requestId)
    }

  }, [clearStream, handleStream, isActiveRequest, updateMessages]);

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
  }, [runStream, sessionId, updateMessages])
  const abort = useCallback(() => {
    const activeStream = activeStreamRef.current;
    if (!activeStream) return;
    activeStreamRef.current = null;
    setStreaming({
      status: "idle"
    });
    activeStream.controller.abort();
  }, []);
  return { messages, streaming, submit, abort };
}
