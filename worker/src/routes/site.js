import { Hono } from "hono";
import { requireAuth, requirePermission } from "../lib/auth.js";
import { latestSiteBuild, triggerSiteBuild } from "../lib/deploy.js";
import { fail, logActivity } from "../lib/util.js";

// Dashboard summary, activity log and manual site rebuilds.
const site = new Hono();
site.use("*", requireAuth);

site.get("/dashboard", async (c) => {
  const user = c.get("user");
  const [{ results: counts }, { results: recent }, { results: mine }] = await Promise.all([
    c.env.DB.prepare("SELECT status, COUNT(*) AS n FROM posts GROUP BY status").all(),
    c.env.DB.prepare(
      "SELECT id, title, status, author_name, updated_at, published_at FROM posts ORDER BY updated_at DESC LIMIT 6"
    ).all(),
    c.env.DB.prepare(
      "SELECT id, title, status, updated_at FROM posts WHERE author_id = ? AND status != 'published' ORDER BY updated_at DESC LIMIT 6"
    )
      .bind(user.id)
      .all(),
  ]);
  const byStatus = Object.fromEntries(counts.map((r) => [r.status, r.n]));
  return c.json({
    counts: { draft: byStatus.draft ?? 0, review: byStatus.review ?? 0, published: byStatus.published ?? 0 },
    recent: recent.map((r) => ({ id: r.id, title: r.title, status: r.status, authorName: r.author_name, updatedAt: r.updated_at })),
    myDrafts: mine.map((r) => ({ id: r.id, title: r.title, status: r.status, updatedAt: r.updated_at })),
  });
});

site.get("/activity", requirePermission("activity.view"), async (c) => {
  const limit = Math.min(Number(c.req.query("limit")) || 100, 500);
  const { results } = await c.env.DB.prepare("SELECT * FROM activity ORDER BY id DESC LIMIT ?").bind(limit).all();
  return c.json({
    activity: results.map((r) => ({
      id: r.id,
      userName: r.user_name,
      action: r.action,
      entity: r.entity,
      entityId: r.entity_id,
      detail: r.detail,
      createdAt: r.created_at,
    })),
  });
});

site.get("/deploy", async (c) => c.json(await latestSiteBuild(c.env)));

site.post("/deploy", requirePermission("deploy.trigger"), async (c) => {
  const result = await triggerSiteBuild(c.env, "manual rebuild");
  if (!result.triggered) {
    fail(result.reason === "not-configured" ? 503 : 502, "Couldn't start the website update. Check the GitHub connection settings.");
  }
  await logActivity(c, "site.rebuild", "site", null, "Manual rebuild");
  return c.json(result);
});

export default site;
