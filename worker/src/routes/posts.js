import { Hono } from "hono";
import { can, requireAuth } from "../lib/auth.js";
import { newId } from "../lib/crypto.js";
import { scheduleSiteBuild } from "../lib/deploy.js";
import { bool, fail, logActivity, nowIso, slug, tags, text, uniqueSlug, url } from "../lib/util.js";

const posts = new Hono();
posts.use("*", requireAuth);

const LIST_COLUMNS = `p.id, p.slug, p.title, p.excerpt, p.status, p.cover_media_id, p.category_id, p.author_id, p.author_name,
  p.published_at, p.created_at, p.updated_at, p.seo_title, p.seo_description, p.focus_keyword, p.noindex,
  c.name AS category_name, u.name AS updated_by_name`;

export function postFromRow(row) {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    excerpt: row.excerpt,
    contentHtml: row.content_html,
    coverMediaId: row.cover_media_id,
    coverAlt: row.cover_alt,
    categoryId: row.category_id,
    categoryName: row.category_name ?? null,
    tags: row.tags ? JSON.parse(row.tags) : [],
    status: row.status,
    authorId: row.author_id,
    authorName: row.author_name,
    seoTitle: row.seo_title,
    seoDescription: row.seo_description,
    focusKeyword: row.focus_keyword,
    canonicalUrl: row.canonical_url,
    noindex: Boolean(row.noindex),
    ogMediaId: row.og_media_id,
    publishedAt: row.published_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    updatedByName: row.updated_by_name ?? null,
  };
}

async function loadPost(c, id) {
  const row = await c.env.DB.prepare(
    `SELECT p.*, c.name AS category_name, u.name AS updated_by_name
       FROM posts p LEFT JOIN categories c ON c.id = p.category_id LEFT JOIN users u ON u.id = p.updated_by
      WHERE p.id = ?`
  )
    .bind(id)
    .first();
  if (!row) fail(404, "Post not found.");
  return row;
}

function canEdit(user, row) {
  if (can(user, "posts.editAny")) return true;
  return row.author_id === user.id && row.status !== "published";
}

async function checkRefs(db, { categoryId, coverMediaId, ogMediaId }) {
  if (categoryId && !(await db.prepare("SELECT id FROM categories WHERE id = ?").bind(categoryId).first())) fail(400, "Unknown category.");
  for (const id of [coverMediaId, ogMediaId]) {
    if (id && !(await db.prepare("SELECT id FROM media WHERE id = ? AND mime LIKE 'image/%'").bind(id).first())) {
      fail(400, "Choose an image for the cover and social image (documents can't be used there).");
    }
  }
}

/** Validates editable fields; `existing` is the current row when updating. */
function readFields(body, existing = {}) {
  const get = (key, fallback) => (body[key] !== undefined ? body[key] : fallback);
  return {
    title: text(get("title", existing.title), "Title", { required: true, max: 160 }),
    slugInput: text(get("slug", existing.slug), "URL slug", { max: 100 }),
    excerpt: text(get("excerpt", existing.excerpt), "Summary", { max: 400 }),
    contentHtml: text(get("contentHtml", existing.content_html), "Content", { max: 400000 }),
    coverMediaId: text(get("coverMediaId", existing.cover_media_id), "Cover image", { max: 40 }) || null,
    coverAlt: text(get("coverAlt", existing.cover_alt), "Cover image description", { max: 200 }),
    categoryId: text(get("categoryId", existing.category_id), "Category", { max: 40 }) || null,
    tags: JSON.stringify(tags(get("tags", existing.tags ? JSON.parse(existing.tags) : []))),
    authorName: text(get("authorName", existing.author_name), "Author name", { max: 80 }),
    seoTitle: text(get("seoTitle", existing.seo_title), "SEO title", { max: 120 }),
    seoDescription: text(get("seoDescription", existing.seo_description), "Meta description", { max: 320 }),
    focusKeyword: text(get("focusKeyword", existing.focus_keyword), "Focus keyword", { max: 80 }),
    canonicalUrl: url(get("canonicalUrl", existing.canonical_url), "Canonical URL"),
    noindex: bool(get("noindex", existing.noindex)),
    ogMediaId: text(get("ogMediaId", existing.og_media_id), "Social image", { max: 40 }) || null,
  };
}

posts.get("/", async (c) => {
  const user = c.get("user");
  const { status, q, category, mine } = c.req.query();
  const where = [];
  const args = [];
  if (status && ["draft", "review", "published"].includes(status)) {
    where.push("p.status = ?");
    args.push(status);
  }
  if (category) {
    where.push("p.category_id = ?");
    args.push(category);
  }
  if (q) {
    where.push("(p.title LIKE ? OR p.slug LIKE ?)");
    args.push(`%${q}%`, `%${q}%`);
  }
  if (mine === "1") {
    where.push("p.author_id = ?");
    args.push(user.id);
  }
  const sql = `SELECT ${LIST_COLUMNS} FROM posts p
    LEFT JOIN categories c ON c.id = p.category_id LEFT JOIN users u ON u.id = p.updated_by
    ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
    ORDER BY p.updated_at DESC LIMIT 500`;
  const { results } = await c.env.DB.prepare(sql).bind(...args).all();
  return c.json({ posts: results.map((r) => ({ ...postFromRow(r), canEdit: canEdit(user, r) })) });
});

posts.get("/:id", async (c) => {
  const row = await loadPost(c, c.req.param("id"));
  return c.json({ post: { ...postFromRow(row), canEdit: canEdit(c.get("user"), row) } });
});

posts.post("/", async (c) => {
  const user = c.get("user");
  const f = readFields(await c.req.json());
  await checkRefs(c.env.DB, f);
  const id = newId("post");
  const finalSlug = await uniqueSlug(c.env.DB, "posts", slug(f.slugInput, f.title));
  const now = nowIso();
  await c.env.DB.prepare(
    `INSERT INTO posts (id, slug, title, excerpt, content_html, cover_media_id, cover_alt, category_id, tags, status,
       author_id, author_name, seo_title, seo_description, focus_keyword, canonical_url, noindex, og_media_id,
       created_at, updated_at, updated_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  )
    .bind(
      id, finalSlug, f.title, f.excerpt, f.contentHtml, f.coverMediaId, f.coverAlt, f.categoryId, f.tags,
      user.id, f.authorName || user.name, f.seoTitle, f.seoDescription, f.focusKeyword, f.canonicalUrl, f.noindex, f.ogMediaId,
      now, now, user.id
    )
    .run();
  await logActivity(c, "post.create", "post", id, f.title);
  const row = await loadPost(c, id);
  return c.json({ post: { ...postFromRow(row), canEdit: true } }, 201);
});

posts.put("/:id", async (c) => {
  const user = c.get("user");
  const existing = await loadPost(c, c.req.param("id"));
  if (!canEdit(user, existing)) fail(403, "You can't edit this post.");
  const body = await c.req.json();
  if (body.expectedUpdatedAt && body.expectedUpdatedAt !== existing.updated_at) {
    fail(409, "Someone else saved this post after you opened it. Reload to see their changes before saving.");
  }
  const f = readFields(body, existing);
  await checkRefs(c.env.DB, f);
  const finalSlug = await uniqueSlug(c.env.DB, "posts", slug(f.slugInput, f.title), existing.id);
  await c.env.DB.prepare(
    `UPDATE posts SET slug = ?, title = ?, excerpt = ?, content_html = ?, cover_media_id = ?, cover_alt = ?, category_id = ?,
       tags = ?, author_name = ?, seo_title = ?, seo_description = ?, focus_keyword = ?, canonical_url = ?, noindex = ?,
       og_media_id = ?, updated_at = ?, updated_by = ?
     WHERE id = ?`
  )
    .bind(
      finalSlug, f.title, f.excerpt, f.contentHtml, f.coverMediaId, f.coverAlt, f.categoryId, f.tags,
      f.authorName || existing.author_name, f.seoTitle, f.seoDescription, f.focusKeyword, f.canonicalUrl, f.noindex,
      f.ogMediaId, nowIso(), user.id, existing.id
    )
    .run();
  await logActivity(c, "post.update", "post", existing.id, f.title);
  if (existing.status === "published") scheduleSiteBuild(c, `updated post ${finalSlug}`);
  const row = await loadPost(c, existing.id);
  return c.json({ post: { ...postFromRow(row), canEdit: canEdit(user, row) } });
});

async function setStatus(c, id, status, { publishedAt } = {}) {
  await c.env.DB.prepare(
    `UPDATE posts SET status = ?, published_at = COALESCE(?, published_at), updated_at = ?, updated_by = ? WHERE id = ?`
  )
    .bind(status, publishedAt ?? null, nowIso(), c.get("user").id, id)
    .run();
  return loadPost(c, id);
}

posts.post("/:id/submit", async (c) => {
  const user = c.get("user");
  const row = await loadPost(c, c.req.param("id"));
  if (!canEdit(user, row)) fail(403, "You can't submit this post.");
  if (row.status !== "draft") fail(400, "Only drafts can be submitted for review.");
  const updated = await setStatus(c, row.id, "review");
  await logActivity(c, "post.submit", "post", row.id, row.title);
  return c.json({ post: { ...postFromRow(updated), canEdit: canEdit(user, updated) } });
});

posts.post("/:id/publish", async (c) => {
  const user = c.get("user");
  if (!can(user, "posts.publish")) fail(403, "Only editors and admins can publish.");
  const row = await loadPost(c, c.req.param("id"));
  if (!row.content_html.replace(/<[^>]*>/g, "").trim()) fail(400, "Add some content before publishing.");
  const updated = await setStatus(c, row.id, "published", { publishedAt: row.published_at ? null : nowIso() });
  await logActivity(c, "post.publish", "post", row.id, row.title);
  scheduleSiteBuild(c, `published ${row.slug}`);
  return c.json({ post: { ...postFromRow(updated), canEdit: true } });
});

posts.post("/:id/unpublish", async (c) => {
  const user = c.get("user");
  if (!can(user, "posts.publish")) fail(403, "Only editors and admins can unpublish.");
  const row = await loadPost(c, c.req.param("id"));
  const wasLive = row.status === "published";
  const updated = await setStatus(c, row.id, "draft");
  await logActivity(c, wasLive ? "post.unpublish" : "post.return", "post", row.id, row.title);
  if (wasLive) scheduleSiteBuild(c, `unpublished ${row.slug}`);
  return c.json({ post: { ...postFromRow(updated), canEdit: true } });
});

posts.delete("/:id", async (c) => {
  const user = c.get("user");
  const row = await loadPost(c, c.req.param("id"));
  const allowed = can(user, "posts.editAny") || (row.author_id === user.id && row.status !== "published");
  if (!allowed) fail(403, "You can't delete this post.");
  await c.env.DB.prepare("DELETE FROM posts WHERE id = ?").bind(row.id).run();
  await logActivity(c, "post.delete", "post", row.id, row.title);
  if (row.status === "published") scheduleSiteBuild(c, `deleted ${row.slug}`);
  return c.json({ ok: true });
});

export default posts;
