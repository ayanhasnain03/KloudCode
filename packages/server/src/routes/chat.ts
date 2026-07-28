import { Hono } from "hono";
import { z } from "zod";
import { streamSSE } from "hono/streaming";
import { zValidator } from "@hono/zod-validator";

import { streamText as aiStreamText, stepCountIs } from "ai"
import { createTools } from "../tools";
import { db } from "@kloud-code/database";
import { buildSystemPrompt } from "../system-prompt";

import { Mode, MessageStatus } from "@kloud-code/database";

import { messagePartsSchema, type ChatStreamEvent, type MessagePart, toolCallArgsSchema } from "@kloud-code/shared";
import type { Prisma } from "@kloud-code/database"
import { isSupportedChatModel, resolveChatModel } from "../lib/models";

const submitSchema = z.object({
  content: z.string(),
  mode: z.enum(Mode),
  model: z.string().refine(isSupportedChatModel, "Unsupported model")
});

const submitValidator = zValidator("json", submitSchema, (result, c) => {
  if (!result.success) {
    return c.json({ error: "Invalid rrequest body" }, 400)
  }
});

// this use for preventing multiple resume sessions for the same session
const activeResumeSessionIds = new Set<string>();
// remove error messages and empty assistant messages from the conversation
function buildConversationHistroy(
  messages: {
    role: "USER" | "ASSISTANT" | "ERROR";
    content: string,
    status: MessageStatus
  }[]
) {
  return messages.flatMap((m) => {
    if (m.role === "ERROR") return [];
    if (m.role === "ASSISTANT" && m.content.length === 0) return [];
    return [
      {
        role: m.role === "USER" ? ("user" as const) : ("assistant" as const),
        content: m.content
      }
    ]
  })
};

function getResumableUserMessage(
  messages: {
    role: "USER" | "ASSISTANT" | "ERROR";
    model: string;
    mode: Mode;
  }[]
) {

  const lastMessage = messages[messages.length - 1];
  if (!lastMessage || lastMessage.role !== "USER") return null;

  return lastMessage;
};

type StreamParams = {
  sessionId: string;
  model: string;
  cwd: string | null;
  history: { role: "user" | "assistant"; content: string }[];
  mode: Mode;
  abortController: AbortController
}


async function streamAIResponse(
  stream: Parameters<Parameters<typeof streamSSE>[1]>[0],
  params: StreamParams
) {
  const { sessionId, model, cwd, history, mode, abortController } = params;


  const startTime = Date.now();
  const tools = cwd ? createTools(cwd, mode) : undefined;
  // store the parts of the message in an array
  const parts: MessagePart[] = [];

  const getFullText = () =>
    parts
      .filter((p): p is Extract<MessagePart, { type: "text" }> => p.type === "text")
      .map((p) => p.text)
      .join("");

  const resolvedModel = resolveChatModel(model);

  const persistInterruptedMessage = async () => {
    const fullText = getFullText();
    if (fullText.length === 0 && parts.length === 0) return;

    const elapsedMs = Date.now() - startTime;
    const validatedParts: Prisma.InputJsonValue | undefined = parts.length > 0 ? messagePartsSchema.parse(parts) : undefined;

    await db.message.create({
      data: {
        sessionId,
        role: "ASSISTANT",
        status: MessageStatus.INTERRUPTED,
        model,
        content: fullText,
        mode,
        duration: Math.round(elapsedMs / 1000),
        parts: validatedParts
      }
    })
  }
  try {
    const result = aiStreamText({
      model: resolvedModel.model,
      system: buildSystemPrompt({ mode, cwd }),
      tools,
      stopWhen: tools ? stepCountIs(50) : undefined,
      messages: history,
      abortSignal: abortController.signal,
      providerOptions: resolvedModel.providerOptions as Parameters<
        typeof aiStreamText
      >[0]["providerOptions"],
    });

    const appendReasoningDelta = async (delta: string) => {
      if (delta.length === 0) return;

      const last = parts[parts.length - 1];
      if (last && last.type === "reasoning") {
        last.text += delta;
      } else {
        parts.push({
          type: "reasoning",
          text: delta,
        });
      }

      const event: ChatStreamEvent = {
        type: "reasoning-delta",
        text: delta,
      };
      await stream.writeSSE({
        event: "reasoning-delta",
        data: JSON.stringify(event),
      });
    };

    // Keep the SSE connection alive during long bash/tool work — Bun closes
    // idle connections (idleTimeout), which aborts the turn mid-install.
    const heartbeat = setInterval(() => {
      if (stream.aborted || abortController.signal.aborted) return;
      const ping: ChatStreamEvent = { type: "ping" };
      void stream.writeSSE({
        event: "ping",
        data: JSON.stringify(ping),
      });
    }, 5_000);

    try {
      for await (const part of result.fullStream) {
        if (stream.aborted) break;
        if (part.type === "text-delta") {
          const last = parts[parts.length - 1];
          if (last && last.type === "text") {
            last.text += part.text;
          } else {
            parts.push({
              type: "text",
              text: part.text
            });
          }

          const event: ChatStreamEvent = {
            type: "text-delta",
            text: part.text
          };

          await stream.writeSSE({
            event: "text-delta",
            data: JSON.stringify(event)
          });
        }


        if (part.type === "reasoning-delta") {
          await appendReasoningDelta(part.text);
        }
        if (part.type === "tool-call") {
          const args = toolCallArgsSchema.parse(part.input);

          parts.push({
            type: "tool-call",
            id: part.toolCallId,
            name: part.toolName,
            args
          });

          const event: ChatStreamEvent = {
            type: "tool-call",
            toolCallId: part.toolCallId,
            toolName: part.toolName,
            args
          };
          await stream.writeSSE({
            event: "tool-call",
            data: JSON.stringify(event)
          });
        }


        if (part.type === "tool-result") {
          const resultStr = typeof part.output === "string" ? part.output : JSON.stringify(part.output);

          // find current tool call part because we need to update the result of the tool call

          const tcPart = parts.find((p): p is Extract<MessagePart, { type: "tool-call" }> => p.type === "tool-call" && p.id === part.toolCallId);

          if (tcPart) {
            tcPart.result = resultStr;
          };

          const event: ChatStreamEvent = {
            type: "tool-result",
            toolCallId: part.toolCallId,
            result: resultStr
          }

          await stream.writeSSE({
            event: "tool-result",
            data: JSON.stringify(event)
          });
        }


        if (part.type === "error") {
          throw part.error
        }
      }
    } finally {
      clearInterval(heartbeat);
    }

    if (stream.aborted || abortController.signal.aborted) {
      await persistInterruptedMessage();
      return;
    }

    // Some Responses API turns bill reasoning tokens but stream empty deltas.
    // Fall back to the aggregated reasoning text so DB/UI still get a Thought block.
    const hasReasoningPart = parts.some((p) => p.type === "reasoning" && p.text.trim().length > 0);
    if (!hasReasoningPart) {
      try {
        const reasoningText = await result.reasoningText;
        if (reasoningText && reasoningText.trim().length > 0) {
          await appendReasoningDelta(reasoningText);
        }
      } catch {
        // Stream already finished; ignore if aggregated reasoning is unavailable.
      }
    }

    const elapsedMs = Date.now() - startTime;
    const fullText = getFullText();
    const validatedParts: Prisma.InputJsonValue | undefined =
      parts.length > 0 ? messagePartsSchema.parse(parts) : undefined;
    const assistantMessage = await db.message.create({
      data: {
        sessionId,
        role: "ASSISTANT",
        status: MessageStatus.COMPLETED,
        model,
        content: fullText,
        mode,
        duration: Math.round(elapsedMs / 1000),
        parts: validatedParts
      }
    });

    const doneEvent: ChatStreamEvent = {
      type: "done",
      messageId: assistantMessage.id,
      durationMs: elapsedMs
    };

    await stream.writeSSE({
      event: "done",
      data: JSON.stringify(doneEvent)
    })
  } catch (error) {
    if (abortController.signal.aborted) {
      await persistInterruptedMessage();
      return;
    };

    const message = error instanceof Error ? error.message : String(error);

    await db.message.create({
      data: {
        sessionId,
        role: "ERROR",
        status: MessageStatus.COMPLETED,
        model,
        content: message,
        mode
      }
    });

    const errorEvent: ChatStreamEvent = { type: "error", message };

    await stream.writeSSE({
      event: "error",
      data: JSON.stringify(errorEvent)
    })
  }
};

const app = new Hono()
  .post("/:sessionId/resume", async (c) => {
    const sessionId = c.req.param("sessionId");

    const session = await db.session.findUnique({
      where: {
        id: sessionId,
      },
      include: {
        messages: {
          orderBy: {
            createdAt: "asc",
          },
        },
      },
    });

    if (!session) {
      return c.json(
        {
          error: "Session not found",
        },
        404
      );
    }

    const resumableMessage = getResumableUserMessage(session.messages);

    if (!resumableMessage) {
      return c.json(
        {
          error: "Session has no pending user message to resume",
        },
        409
      );
    }

    if (!isSupportedChatModel(resumableMessage.model)) {
      return c.json(
        {
          error: `Session uses unsupported model: ${resumableMessage.model}`,
        },
        409
      );
    }
    if (activeResumeSessionIds.has(sessionId)) {
      return c.json(
        {
          error: "Session is already having an active resume session",
        },
        409
      );
    }
    activeResumeSessionIds.add(sessionId);

    const history = buildConversationHistroy(session.messages);

    const abortController = new AbortController();

    try {
      return streamSSE(c, async (stream) => {
        stream.onAbort(() => {
          abortController.abort();
        });

        try {
          await streamAIResponse(stream, {
            sessionId,
            model: resumableMessage.model,
            cwd: session.cwd,
            history,
            mode: resumableMessage.mode,
            abortController,
          });
        } finally {
          activeResumeSessionIds.delete(sessionId);
        }
      },
        async (err, stream) => {
          activeResumeSessionIds.delete(sessionId);
          const message = err instanceof Error ? err.message : String(err);

          const errorEvent: ChatStreamEvent = {
            type: "error",
            message
          }
          await stream.writeSSE({
            event: "error",
            data: JSON.stringify(errorEvent)
          })
        }
      );
    } catch (error) {
      activeResumeSessionIds.delete(sessionId);
      throw error;
    }
  })
  .post("/:sessionId", submitValidator, async (c) => {
    const sessionId = c.req.param("sessionId");
    if (!sessionId) return c.json({
      error: "Session not found"
    }, 404)

    const session = await db.session.findUnique({
      where: {
        id: sessionId
      },
      include: {
        messages: {
          orderBy: {
            createdAt: "asc"
          }
        }
      }

    })

    if (!session) {
      return c.json({
        error: "Session not found"
      }, 404)
    }

    const data = c.req.valid("json")

    await db.message.create({
      data: {
        sessionId,
        role: "USER",
        status: MessageStatus.COMPLETED,
        model: data.model,
        content: data.content,
        mode: data.mode
      }
    });


    const history = buildConversationHistroy([
      ...session.messages,
      {
        role: "USER" as const,
        content: data.content,
        status: MessageStatus.COMPLETED
      }
    ])


    const abortController = new AbortController();

    return streamSSE(
      c,
      async (stream) => {
        stream.onAbort(() => {
          abortController.abort();
        });
        await streamAIResponse(stream, {
          sessionId,
          model: data.model,
          cwd: session.cwd,
          history,
          mode: data.mode,
          abortController
        })
      },
      async (err, stream) => {
        const message = err instanceof Error ? err.message : String(err);
        const errorEvent: ChatStreamEvent = {
          type: "error",
          message
        }
        await stream.writeSSE({
          event: "error", data: JSON.stringify(errorEvent)
        })
      }
    );

  });


export default app;
