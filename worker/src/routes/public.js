import { Hono } from "hono";
import { readSettings } from "./seo.js";

// Read-only endpoints used by the main website's build. Only published content
// is exposed; drafts and posts in review never leave the database.
const pub = new Hono();

const MEDIA_IN_HTML = /\/api\/public\/media\/([A-Za-z0-9_-]+)/g;

pub.get("/content", async (c) => {
  const db = c.env.DB;
  const [{ results: posts }, { results: categories }, { results: pages }, settings] = await Promise.all([
    db
      .prepare(
        `SELECT p.*, c.slug AS category_slug FROM posts p LEFT JOIN categories c ON c.id = p.category_id
          WHERE p.status = 'published' ORDER BY p.published_at DESC`
      )
      .all(),
    db.prepare("SELECT * FROM categories ORDER BY name").all(),
    db.prepare("SELECT * FROM page_seo").all(),
    readSettings(db),
  ]);

  const mediaIds = new Set();
  const addMedia = (id) => id && mediaIds.add(id);
  for (const p of posts) {
    addMedia(p.cover_media_id);
    addMedia(p.og_media_id);
    for (const m of p.content_html.matchAll(MEDIA_IN_HTML)) addMedia(m[1]);
  }
  for (const p of pages) addMedia(p.og_media_id);
  addMedia(settings.seo_defaults?.defaultOgMediaId);

  let media = [];
  if (mediaIds.size) {
    const ids = [...mediaIds];
    const placeholders = ids.map(() => "?").join(",");
    ({ results: media } = await db
      .prepare(`SELECT id, filename, mime, width, height, alt FROM media WHERE id IN (${placeholders})`)
      .bind(...ids)
      .all());
  }

  return c.json({
    generatedAt: new Date().toISOString(),
    settings,
    pages: Object.fromEntries(
      pages.map((p) => [p.page_key, { label: p.label, path: p.path, title: p.title, description: p.description, ogMediaId: p.og_media_id, noindex: Boolean(p.noindex) }])
    ),
    categories: categories.map((c) => ({
      id: c.id,
      slug: c.slug,
      name: c.name,
      description: c.description,
      seoTitle: c.seo_title,
      seoDescription: c.seo_description,
    })),
    posts: posts.map((p) => ({
      id: p.id,
      slug: p.slug,
      title: p.title,
      excerpt: p.excerpt,
      contentHtml: p.content_html,
      coverMediaId: p.cover_media_id,
      coverAlt: p.cover_alt,
      categorySlug: p.category_slug,
      tags: JSON.parse(p.tags || "[]"),
      authorName: p.author_name,
      publishedAt: p.published_at,
      updatedAt: p.updated_at,
      seoTitle: p.seo_title,
      seoDescription: p.seo_description,
      focusKeyword: p.focus_keyword,
      canonicalUrl: p.canonical_url,
      noindex: Boolean(p.noindex),
      ogMediaId: p.og_media_id,
    })),
    media,
  });
});

pub.get("/media/:id", async (c) => {
  const id = c.req.param("id").replace(/\.[a-z]+$/i, "");
  const row = await c.env.DB.prepare("SELECT filename, mime, data FROM media WHERE id = ?").bind(id).first();
  if (!row) return c.json({ error: "File not found." }, 404);
  const bytes = row.data instanceof ArrayBuffer ? new Uint8Array(row.data) : Uint8Array.from(row.data);
  const headers = {
    "Content-Type": row.mime,
    "Cache-Control": "public, max-age=31536000, immutable",
    "X-Content-Type-Options": "nosniff",
    "Content-Security-Policy": "default-src 'none'",
  };
  // Documents are downloaded rather than opened from the API domain; the main
  // website serves its own copy (see scripts/fetch-cms.mjs there).
  if (row.mime === "application/pdf") headers["Content-Disposition"] = `attachment; filename="${row.filename}"`;
  return new Response(bytes, { headers });
});

export default pub;
