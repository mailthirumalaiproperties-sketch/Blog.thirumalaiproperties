import { sha256Hex } from "./crypto.js";
import { fail, nowIso } from "./util.js";

export const SESSION_HOURS = 12;

// What each role may do. Writers create content; editors publish it; admins
// additionally manage users and site-wide settings.
export const PERMISSIONS = {
  "posts.publish": ["admin", "editor"],
  "posts.editAny": ["admin", "editor"],
  "categories.manage": ["admin", "editor"],
  "media.manageAny": ["admin", "editor"],
  "seo.pages": ["admin", "editor"],
  "settings.manage": ["admin"],
  "users.manage": ["admin"],
  "activity.view": ["admin"],
  "deploy.trigger": ["admin", "editor"],
};

export function can(user, permission) {
  return Boolean(user && PERMISSIONS[permission]?.includes(user.role));
}

export const requireAuth = async (c, next) => {
  const header = c.req.header("Authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  if (!token) fail(401, "Please log in.");

  const tokenHash = await sha256Hex(token);
  const row = await c.env.DB.prepare(
    `SELECT u.id, u.email, u.name, u.role, u.active, u.must_change_password, s.expires_at
       FROM sessions s JOIN users u ON u.id = s.user_id
      WHERE s.token_hash = ?`
  )
    .bind(tokenHash)
    .first();

  if (!row || !row.active || row.expires_at <= nowIso()) {
    if (row) await c.env.DB.prepare("DELETE FROM sessions WHERE token_hash = ?").bind(tokenHash).run();
    fail(401, "Your session has expired. Please log in again.");
  }

  c.set("user", {
    id: row.id,
    email: row.email,
    name: row.name,
    role: row.role,
    mustChangePassword: Boolean(row.must_change_password),
  });
  c.set("tokenHash", tokenHash);

  // Until a temporary password is replaced, only allow the endpoints needed to change it.
  const path = new URL(c.req.url).pathname;
  if (row.must_change_password && !["/api/auth/me", "/api/auth/password", "/api/auth/logout"].includes(path)) {
    fail(403, "Please set a new password before continuing.");
  }
  await next();
};

export const requirePermission = (permission) => async (c, next) => {
  if (!can(c.get("user"), permission)) fail(403, "You don't have permission to do that.");
  await next();
};

export function publicUser(row) {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    role: row.role,
    active: Boolean(row.active ?? 1),
    mustChangePassword: Boolean(row.must_change_password ?? row.mustChangePassword),
    lastLoginAt: row.last_login_at ?? null,
    createdAt: row.created_at ?? null,
  };
}
