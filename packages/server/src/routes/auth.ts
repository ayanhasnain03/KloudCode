import { Hono } from "hono";

const app = new Hono()
  .get("/callback", async (c) => {
    const code = c.req.query("code");
    const state = c.req.query("state");
    const error = c.req.query("error");

    if (error) {
      return c.json({ error: error }, 400);
    }
    if (!code || !state) {
      return c.json({ error: "Missing code or state" }, 400);
    }

    try {
      const [encoded] = state.split(".");
      if (!encoded) {
        throw new Error("Invalid state");
      }
      const payload = JSON.parse(Buffer.from(encoded, "base64url").toString());

      const { port } = payload;
      if (!port || typeof port !== "number") {
        throw new Error("Invalid state");
      }

      const redirectUrl = `http://localhost:${port}/callback?code=${encodeURIComponent(code)}&state=${encodeURIComponent(state)}`;
      return c.redirect(redirectUrl);
    } catch (error) {
      return c.json({ error: "Invalid state" }, 400);
    }
  });

export default app;
