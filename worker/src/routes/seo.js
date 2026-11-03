import { Hono } from "hono";
import { requireAuth, requirePermission } from "../lib/auth.js";
import { scheduleSiteBuild } from "../lib/deploy.js";
import { bool, fail, logActivity, nowIso, text } from "../lib/util.js";

const seo = new Hono();
seo.use("*", requireAuth);

const pageFromRow = (r) => ({
  key: r.page_key,
  label: r.label,
  path: r.path,
  title: r.title,
  description: r.description,
  ogMediaId: r.og_media_id,
  noindex: Boolean(r.noindex),
  updatedAt: r.updated_at,
  updatedByName: r.updated_by_name ?? null,
});

seo.get("/pages", async (c) => {
  const { results } = await c.env.DB.prepare(
    `SELECT s.*, u.name AS updated_by_name FROM page_seo s LEFT JOIN users u ON u.id = s.updated_by
      ORDER BY CASE s.page_key WHEN 'home' THEN 0 WHEN 'blog' THEN 9 ELSE 1 END, s.label`
  ).all();
  return c.json({ pages: results.map(pageFromRow) });
});

seo.put("/pages/:key", requirePermission("seo.pages"), async (c) => {
  const key = c.req.param("key");
  const row = await c.env.DB.prepare("SELECT label FROM page_seo WHERE page_key = ?").bind(key).first();
  if (!row) fail(404, "Page not found.");
  const body = await c.req.json();
  const ogMediaId = text(body.ogMediaId, "Social image", { max: 40 }) || null;
  if (ogMediaId && !(await c.env.DB.prepare("SELECT id FROM media WHERE id = ?").bind(ogMediaId).first())) fail(400, "Unknown image.");
  await c.env.DB.prepare(
    "UPDATE page_seo SET title = ?, description = ?, og_media_id = ?, noindex = ?, updated_at = ?, updated_by = ? WHERE page_key = ?"
  )
    .bind(
      text(body.title, "SEO title", { required: true, max: 120 }),
      text(body.description, "Meta description", { max: 320 }),
      ogMediaId,
      bool(body.noindex),
      nowIso(),
      c.get("user").id,
      key
    )
    .run();
  await logActivity(c, "seo.page", "page", key, row.label);
  scheduleSiteBuild(c, `page SEO ${key}`);
  return c.json({ ok: true });
});

// --- Site-wide settings (admins only) -----------------------------------------

const SETTING_FIELDS = {
  organization: {
    name: 80, phone: 30, phone2: 30, whatsapp: 20, email: 254, streetAddress: 200, locality: 80, postalCode: 12,
    region: 80, country: 2, instagram: 300, youtube: 300, facebook: 300,
  },
  seo_defaults: { titleSuffix: 60, defaultDescription: 320, defaultOgMediaId: 40, googleVerification: 120 },
};

export async function readSettings(db) {
  const { results } = await db.prepare("SELECT key, value FROM settings").all();
  return Object.fromEntries(results.map((r) => [r.key, JSON.parse(r.value)]));
}

seo.get("/settings", async (c) => c.json({ settings: await readSettings(c.env.DB) }));

seo.put("/settings/:key", requirePermission("settings.manage"), async (c) => {
  const key = c.req.param("key");
  const fields = SETTING_FIELDS[key];
  if (!fields) fail(404, "Unknown setting.");
  const body = await c.req.json();
  const value = {};
  for (const [field, max] of Object.entries(fields)) value[field] = text(body[field], field, { max }) || (field.endsWith("MediaId") ? null : "");
  if (value.whatsapp && !/^\d{8,15}$/.test(value.whatsapp)) fail(400, "WhatsApp number must be digits only, with country code (e.g. 919514476555).");
  for (const f of ["instagram", "youtube", "facebook"]) {
    if (value[f] && !/^https:\/\//.test(value[f])) fail(400, `${f} link must start with https://`);
  }
  if (value.defaultOgMediaId && !(await c.env.DB.prepare("SELECT id FROM media WHERE id = ?").bind(value.defaultOgMediaId).first())) {
    fail(400, "Unknown image.");
  }
  await c.env.DB.prepare(
    "INSERT INTO settings (key, value, updated_at) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at"
  )
    .bind(key, JSON.stringify(value), nowIso())
    .run();
  await logActivity(c, "settings.update", "settings", key);
  scheduleSiteBuild(c, `settings ${key}`);
  return c.json({ ok: true });
});

export default seo;
