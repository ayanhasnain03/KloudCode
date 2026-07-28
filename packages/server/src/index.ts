import { Hono } from 'hono';
import { sentry } from "@sentry/hono/bun";
import * as Sentry from "@sentry/hono/bun";
import { HTTPException } from 'hono/http-exception';
import chat from "./routes/chat"
import sessions from './routes/sessions';
const app = new Hono()
app.use(
  sentry(app, {
    dsn: "https://dcaec35b2e9cd3e4e3c88c100bb350f9@o4511771266187264.ingest.us.sentry.io/4511771276804096",
    tracesSampleRate: 1.0,
    enableLogs: true,
  }),
);
app.get("/debug-sentry", () => {
  Sentry.logger.info('User triggered test error', {
    action: 'test_error_endpoint',
  });
  Sentry.metrics.count('test_counter', 1);
  throw new Error("My first Sentry error!");
});

app.get('/', (c) => {
  return c.json({ message: 'Hello Hono!' })
});

app.onError((err, c) => {
  if (err instanceof HTTPException) {
    Sentry.logger.warn("Handled Http error", {
      status: err.status,
      message: err.message || "Request failed",
      path: c.req.path,
      method: c.req.method
    });
    Sentry.logger.error("Unhandled server error", {
      path: c.req.path,
      method: c.req.method,
      message: err instanceof Error ? err.message : "Unkown error"
    });
    return c.json({
      error: err.message || 'Internal Server Error',
    }, err.status);

  };

  return c.json({
    error: 'Internal Server Error',
  }, 500)
});

const routes =
  app.route("/sessions", sessions)
    .route("/chat", chat)

export type AppType = typeof routes;

export default {
  port: Number(process.env.PORT) || 3000,
  fetch: app.fetch,
  // Max Bun allows. SSE heartbeats every 5s keep long bash/tool turns alive.
  idleTimeout: 255,
}
