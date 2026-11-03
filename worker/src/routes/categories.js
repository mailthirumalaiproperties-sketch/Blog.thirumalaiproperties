import { Hono } from "hono";
import { requireAuth, requirePermission } from "../lib/auth.js";
import { newId } from "../lib/crypto.js";
import { scheduleSiteBuild } from "../lib/deploy.js";
import { fail, logActivity, nowIso, slug, text, uniqueSlug } from "../lib/util.js";

const categories = new Hono();
categories.use("*", requireAuth);

const fromRow = (r) => ({
  id: r.id,
  slug: r.slug,
  name: r.name,
  description: r.description,
  seoTitle: r.seo_title,
  seoDescription: r.seo_description,
  postCount: r.post_count ?? 0,
  publishedCount: r.published_count ?? 0,
});

function readFields(body) {
  return {
    name: text(body.name, "Name", { required: true, max: 60 }),
    slugInput: text(body.slug, "URL slug", { max: 80 }),
    description: text(body.description, "Description", { max: 400 }),
    seoTitle: text(body.seoTitle, "SEO title", { max: 120 }),
    seoDescription: text(body.seoDescription, "Meta description", { max: 320 }),
  };
}

async function hasPublished(db, categoryId) {
  return Boolean(await db.prepare("SELECT 1 FROM posts WHERE category_id = ? AND status = 'published' LIMIT 1").bind(categoryId).first());
}

categories.get("/", async (c) => {
  const { results } = await c.env.DB.prepare(
    `SELECT c.*, COUNT(p.id) AS post_count, SUM(CASE WHEN p.status = 'published' THEN 1 ELSE 0 END) AS published_count
       FROM categories c LEFT JOIN posts p ON p.category_id = c.id
      GROUP BY c.id ORDER BY c.name`
  ).all();
  return c.json({ categories: results.map(fromRow) });
});

categories.post("/", requirePermission("categories.manage"), async (c) => {
  const f = readFields(await c.req.json());
  const id = newId("cat");
  const finalSlug = await uniqueSlug(c.env.DB, "categories", slug(f.slugInput, f.name));
  const now = nowIso();
  await c.env.DB.prepare(
    "INSERT INTO categories (id, slug, name, description, seo_title, seo_description, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
  )
    .bind(id, finalSlug, f.name, f.description, f.seoTitle, f.seoDescription, now, now)
    .run();
  await logActivity(c, "category.create", "category", id, f.name);
  return c.json({ category: fromRow({ id, slug: finalSlug, name: f.name, description: f.description, seo_title: f.seoTitle, seo_description: f.seoDescription }) }, 201);
});

categories.put("/:id", requirePermission("categories.manage"), async (c) => {
  const id = c.req.param("id");
  if (!(await c.env.DB.prepare("SELECT id FROM categories WHERE id = ?").bind(id).first())) fail(404, "Category not found.");
  const f = readFields(await c.req.json());
  const finalSlug = await uniqueSlug(c.env.DB, "categories", slug(f.slugInput, f.name), id);
  await c.env.DB.prepare(
    "UPDATE categories SET slug = ?, name = ?, description = ?, seo_title = ?, seo_description = ?, updated_at = ? WHERE id = ?"
  )
    .bind(finalSlug, f.name, f.description, f.seoTitle, f.seoDescription, nowIso(), id)
    .run();
  await logActivity(c, "category.update", "category", id, f.name);
  if (await hasPublished(c.env.DB, id)) scheduleSiteBuild(c, `updated category ${finalSlug}`);
  return c.json({ ok: true });
});

categories.delete("/:id", requirePermission("categories.manage"), async (c) => {
  const id = c.req.param("id");
  const row = await c.env.DB.prepare("SELECT name FROM categories WHERE id = ?").bind(id).first();
  if (!row) fail(404, "Category not found.");
  const affectsSite = await hasPublished(c.env.DB, id);
  await c.env.DB.prepare("DELETE FROM categories WHERE id = ?").bind(id).run();
  await logActivity(c, "category.delete", "category", id, row.name);
  if (affectsSite) scheduleSiteBuild(c, "deleted category");
  return c.json({ ok: true });
});

export default categories;
