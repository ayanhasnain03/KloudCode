import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import * as Sentry from "@sentry/hono/bun";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { findSupportedChatModel } from "@kloud-code/shared";
import { db } from "@kloud-code/database";
import { Role, Mode, MessageStatus } from "@kloud-code/database/enums";
import { requireAuth, type AuthenticatedEnv } from "../middleware/require-auth";


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


const app = new Hono<AuthenticatedEnv>()
  .use(requireAuth)
  .get("/", async (c) => {
    const userId = c.get("userId");
    if (!userId) {
      return c.json({ error: "Unauthorized. Please login to continue." }, 401);
    }
    const sessions = await db.session.findMany({
      where: { userId },
      orderBy: {
        updatedAt: "desc",
      },
      select: {
        id: true,
        title: true,
        cwd: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    Sentry.logger.info("Listed session", {
      count: sessions.length,
      userId,
    });
    return c.json(sessions);
  })
  .get("/:id", async (c) => {
    const id = c.req.param("id");
    const userId = c.get("userId");
    if (!userId) {
      return c.json({ error: "Unauthorized. Please login to continue." }, 401);
    }
    const session = await db.session.findFirst({
      where: {
        id,
        userId,
      },
      include: {
        messages: true,
      },
    })
    if (!session) {
      Sentry.logger.warn("Session not found", {
        sessionId: id,
        userId,
      })

      throw new HTTPException(404, { message: 'Session not found' });
    }
    Sentry.logger.info("Loaded session", {
      sessionId: session.id,
    })
    return c.json(session);
  })
  .post("/", createSessionValidator, async (c) => {
    const userId = c.get("userId");
    if (!userId) {
      return c.json({ error: "Unauthorized. Please login to continue." }, 401);
    }
    const { initialMessage, ...data } = c.req.valid('json');

    const session = await db.session.create({
      data: {
        ...data,
        userId,
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
      userId,
    })

    return c.json(session, 201);
  })
export default app;
