import { Hono } from "hono";
import { cors } from "hono/cors";
import { HTTPException } from "hono/http-exception";
import auth from "./routes/auth.js";
import categories from "./routes/categories.js";
import media from "./routes/media.js";
import posts from "./routes/posts.js";
import pub from "./routes/public.js";
import seo from "./routes/seo.js";
import site from "./routes/site.js";
import users from "./routes/users.js";

const app = new Hono();

// The admin panel (blog.thirumalaiproperties.com) is the only browser origin
// allowed to call authenticated endpoints. Public endpoints are open.
app.use("/api/public/*", cors({ origin: "*", allowMethods: ["GET"] }));
app.use("/api/*", async (c, next) => {
  if (c.req.path.startsWith("/api/public/")) return next();
  const allowed = (c.env.ALLOWED_ORIGINS || "").split(",").map((o) => o.trim()).filter(Boolean);
  return cors({
    origin: (origin) => (allowed.includes(origin) ? origin : null),
    allowHeaders: ["Authorization", "Content-Type"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    maxAge: 600,
  })(c, next);
});

app.use("/api/*", async (c, next) => {
  await next();
  c.header("X-Content-Type-Options", "nosniff");
  if (!c.req.path.startsWith("/api/public/")) c.header("Cache-Control", "no-store");
});

app.get("/", (c) => c.json({ service: "Thirumalai Properties CMS API", ok: true }));
app.get("/api/health", (c) => c.json({ ok: true }));

app.route("/api/auth", auth);
app.route("/api/posts", posts);
app.route("/api/categories", categories);
app.route("/api/media", media);
app.route("/api/seo", seo);
app.route("/api/users", users);
app.route("/api/site", site);
app.route("/api/public", pub);

app.notFound((c) => c.json({ error: "Not found." }, 404));

app.onError((err, c) => {
  if (err instanceof HTTPException) return c.json({ error: err.message }, err.status);
  if (err instanceof SyntaxError) return c.json({ error: "Invalid request data." }, 400);
  console.error(err);
  return c.json({ error: "Something went wrong on the server. Please try again." }, 500);
});

export default app;
