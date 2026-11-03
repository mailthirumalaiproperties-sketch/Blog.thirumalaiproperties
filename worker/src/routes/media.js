import { Hono } from "hono";
import { can, requireAuth } from "../lib/auth.js";
import { newId } from "../lib/crypto.js";
import { fail, logActivity, nowIso, text } from "../lib/util.js";

// D1 rows max out at ~2 MB; the admin compresses images to WebP before upload.
export const MAX_IMAGE_BYTES = 1_900_000;

const media = new Hono();
media.use("*", requireAuth);

export const mediaFromRow = (r) => ({
  id: r.id,
  filename: r.filename,
  mime: r.mime,
  size: r.size,
  width: r.width,
  height: r.height,
  alt: r.alt,
  uploadedBy: r.uploaded_by,
  uploadedByName: r.uploaded_by_name ?? null,
  createdAt: r.created_at,
});

/** Detects the real image type from the file's first bytes (never trusts the browser). */
function sniffImageType(bytes) {
  const b = bytes;
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return "image/png";
  if (b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x38) return "image/gif";
  const ascii = (from, to) => String.fromCharCode(...b.slice(from, to));
  if (ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP") return "image/webp";
  return null;
}

function dimension(value) {
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) && n > 0 && n <= 20000 ? n : null;
}

media.get("/", async (c) => {
  const { results } = await c.env.DB.prepare(
    `SELECT m.id, m.filename, m.mime, m.size, m.width, m.height, m.alt, m.uploaded_by, m.created_at, u.name AS uploaded_by_name
       FROM media m LEFT JOIN users u ON u.id = m.uploaded_by
      ORDER BY m.created_at DESC LIMIT 1000`
  ).all();
  return c.json({ media: results.map(mediaFromRow) });
});

media.post("/", async (c) => {
  const user = c.get("user");
  const form = await c.req.parseBody();
  const file = form.file;
  if (!file || typeof file === "string") fail(400, "Choose an image to upload.");
  if (file.size > MAX_IMAGE_BYTES) fail(413, "Image is too large (max 1.9 MB). Try a smaller image.");

  const bytes = new Uint8Array(await file.arrayBuffer());
  const mime = sniffImageType(bytes);
  if (!mime) fail(415, "Only JPEG, PNG, WebP and GIF images are allowed.");

  const id = newId("img");
  const filename = text(file.name || "image", "File name", { max: 120 }).replace(/[^\w.\- ]+/g, "_") || "image";
  const alt = text(form.alt, "Image description", { max: 200 });
  await c.env.DB.prepare(
    "INSERT INTO media (id, filename, mime, size, width, height, alt, data, uploaded_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
  )
    .bind(id, filename, mime, bytes.byteLength, dimension(form.width), dimension(form.height), alt, bytes, user.id, nowIso())
    .run();
  await logActivity(c, "media.upload", "media", id, filename);

  const row = await c.env.DB.prepare(
    "SELECT id, filename, mime, size, width, height, alt, uploaded_by, created_at FROM media WHERE id = ?"
  )
    .bind(id)
    .first();
  return c.json({ media: { ...mediaFromRow(row), uploadedByName: user.name } }, 201);
});

media.put("/:id", async (c) => {
  const user = c.get("user");
  const row = await c.env.DB.prepare("SELECT uploaded_by FROM media WHERE id = ?").bind(c.req.param("id")).first();
  if (!row) fail(404, "Image not found.");
  if (!can(user, "media.manageAny") && row.uploaded_by !== user.id) fail(403, "You can only edit images you uploaded.");
  const alt = text((await c.req.json()).alt, "Image description", { max: 200 });
  await c.env.DB.prepare("UPDATE media SET alt = ? WHERE id = ?").bind(alt, c.req.param("id")).run();
  return c.json({ ok: true });
});

media.delete("/:id", async (c) => {
  const user = c.get("user");
  const id = c.req.param("id");
  const row = await c.env.DB.prepare("SELECT filename, uploaded_by FROM media WHERE id = ?").bind(id).first();
  if (!row) fail(404, "Image not found.");
  if (!can(user, "media.manageAny") && row.uploaded_by !== user.id) fail(403, "You can only delete images you uploaded.");

  const usedInContent = await c.env.DB.prepare("SELECT title FROM posts WHERE content_html LIKE ? LIMIT 1").bind(`%/api/public/media/${id}%`).first();
  if (usedInContent) fail(409, `This image is used inside the post "${usedInContent.title}". Remove it from the post first.`);

  await c.env.DB.prepare("DELETE FROM media WHERE id = ?").bind(id).run();
  await logActivity(c, "media.delete", "media", id, row.filename);
  return c.json({ ok: true });
});

export default media;
