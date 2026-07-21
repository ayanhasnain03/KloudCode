import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import * as Sentry from "@sentry/hono/bun";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { findSupportedChatModel } from "@kloud-code/shared";
import { db } from "@kloud-code/database";
import { Role, Mode, MessageStatus } from "@kloud-code/database/enums";





const createSessionSchema = z.object({
  title: z.string().min(1),
  cwd: z.string().optional(),
  initialMessage: z.object({
    role: z.enum(Role),
    content: z.string(),
    mode: z.enum(Mode),
    model: z.string()
      .refine((id) => !!findSupportedChatModel(id), {
        message: 'Invalid chat model',
      })
  }).optional(),
});


const createSessionValidator = zValidator("json", createSessionSchema, (result, c) => {

  if (!result.success) {
    Sentry.logger.warn("Session creation validation failed", {
      path: c.req.path,
      issues: result.error.issues.length
    });
    return c.json({
      error: 'Invalid request body',
    }, 400)
  }
})


const app = new Hono()
  .get("/", async (c) => {
    const sessions = await db.session.findMany({
      orderBy: {
        createdAt: "desc",
      },
      select: {
        id: true,
        title: true,
        createdAt: true,
      },
    });
    Sentry.logger.info("Listed session", {
      count: sessions.length
    });
    return c.json(sessions);
  })
  .get("/:id", async (c) => {
    // await new Promise((resolve) => setTimeout(resolve, 1000));
    // throw new HTTPException(404, { message: 'Mock error: session not found' });

    const id = c.req.param("id");
    const session = await db.session.findUnique({
      where: {
        id
      },
      include: {
        messages: true,
      },
    })
    if (!session) {

      Sentry.logger.warn("Session not found", {
        sessionId: id,
        userId: "mock-user"
      })

      throw new HTTPException(404, { message: 'Session not found' });
    }
    Sentry.logger.info("Loaded session", {
      sessionId: session.id,
    })
    return c.json(session);
  })
  .post("/", createSessionValidator, async (c) => {

    const { initialMessage, ...data } = c.req.valid('json');

    const session = await db.session.create({
      data: {
        ...data,
        userId: "mock-user-id",
        ...(initialMessage && {
          messages: {
            create: {
              ...initialMessage,
              status: MessageStatus.COMPLETED,
            },
          },
        }),
      },
      include: {
        messages: true,
      },
    });

    Sentry.logger.info("Created session", {
      sessionId: session.id,
      title: session.title,
    })

    return c.json(session, 201);
  })
export default app;
