import { HTTPException } from "hono/http-exception";

export const ROLES = ["admin", "editor", "writer"];
export const MIN_PASSWORD_LENGTH = 10;

export const nowIso = () => new Date().toISOString();

export function fail(status, message) {
  throw new HTTPException(status, { message });
}

/** Trimmed string with length checks. Returns "" for missing optional values. */
export function text(value, name, { max = 200, required = false, min = 0 } = {}) {
  const v = value == null ? "" : String(value).trim();
  if (required && !v) fail(400, `${name} is required.`);
  if (v && v.length < min) fail(400, `${name} must be at least ${min} characters.`);
  if (v.length > max) fail(400, `${name} must be ${max} characters or fewer.`);
  return v;
}

export function email(value) {
  const v = text(value, "Email", { max: 254, required: true }).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) fail(400, "Enter a valid email address.");
  return v;
}

export function password(value, name = "Password") {
  const v = value == null ? "" : String(value);
  if (v.length < MIN_PASSWORD_LENGTH) fail(400, `${name} must be at least ${MIN_PASSWORD_LENGTH} characters.`);
  if (v.length > 200) fail(400, `${name} is too long.`);
  return v;
}

export function slugify(input) {
  return String(input)
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 90)
    .replace(/-+$/g, "");
}

export function slug(value, fallbackSource) {
  const s = slugify(value || fallbackSource || "");
  if (!s) fail(400, "Could not build a URL slug. Use letters or numbers in the title or slug.");
  return s;
}

export function url(value, name) {
  const v = text(value, name, { max: 500 });
  if (v && !/^https:\/\/[^\s]+$/.test(v)) fail(400, `${name} must start with https://`);
  return v;
}

export function bool(value) {
  return value === true || value === 1 || value === "1" || value === "true" ? 1 : 0;
}

export function tags(value) {
  const list = Array.isArray(value) ? value : String(value || "").split(",");
  return [...new Set(list.map((t) => String(t).trim()).filter(Boolean))].slice(0, 15).map((t) => t.slice(0, 40));
}

/** Records who did what, shown on the Activity page. Never throws. */
export async function logActivity(c, action, entity, entityId, detail = "") {
  const user = c.get("user");
  try {
    await c.env.DB.prepare(
      "INSERT INTO activity (user_id, user_name, action, entity, entity_id, detail, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
    )
      .bind(user?.id ?? null, user?.name ?? null, action, entity, entityId, String(detail).slice(0, 300), nowIso())
      .run();
  } catch (err) {
    console.error("activity log failed", err);
  }
}

export async function uniqueSlug(db, table, base, excludeId = null) {
  let candidate = base;
  for (let n = 2; n < 100; n++) {
    const row = await db.prepare(`SELECT id FROM ${table} WHERE slug = ? AND id != ?`).bind(candidate, excludeId ?? "").first();
    if (!row) return candidate;
    candidate = `${base}-${n}`;
  }
  fail(409, "Could not find a free URL slug. Choose a different one.");
}
