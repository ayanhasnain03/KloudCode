import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception';
import sessions from './routes/sessions';
const app = new Hono()

app.get('/', (c) => {
  return c.json({ message: 'Hello Hono!' })
});

app.onError((err, c) => {
  if (err instanceof HTTPException) {
    return c.json({
      error: err.message || 'Internal Server Error',
    }, err.status)
  };

  return c.json({
    error: 'Internal Server Error',
  }, 500)
})
const routes =
  app.route("/sessions", sessions);

export type AppType = typeof routes;

export default {
  port: 3000,
  fetch: app.fetch,
  idleTimeout: 255
}
