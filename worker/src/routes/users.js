import { Hono } from "hono";
import { publicUser, requireAuth, requirePermission } from "../lib/auth.js";
import { hashPassword, newId } from "../lib/crypto.js";
import { bool, email, fail, logActivity, nowIso, password, ROLES, text } from "../lib/util.js";

const users = new Hono();
users.use("*", requireAuth, requirePermission("users.manage"));

function role(value) {
  if (!ROLES.includes(value)) fail(400, "Role must be admin, editor or writer.");
  return value;
}

async function activeAdminCount(db) {
  return (await db.prepare("SELECT COUNT(*) AS n FROM users WHERE role = 'admin' AND active = 1").first()).n;
}

users.get("/", async (c) => {
  const { results } = await c.env.DB.prepare(
    "SELECT u.*, (SELECT COUNT(*) FROM posts p WHERE p.author_id = u.id) AS article_count FROM users u ORDER BY u.active DESC, u.name"
  ).all();
  return c.json({ users: results.map((r) => ({ ...publicUser(r), articleCount: r.article_count })) });
});

// Admin creates the account with a temporary password; the user must change it on first login.
users.post("/", async (c) => {
  const body = await c.req.json();
  const userEmail = email(body.email);
  if (await c.env.DB.prepare("SELECT id FROM users WHERE email = ?").bind(userEmail).first()) fail(409, "A user with that email already exists.");
  const name = text(body.name, "Name", { required: true, max: 80 });
  const { hash, salt } = await hashPassword(password(body.password, "Temporary password"), c.env.PASSWORD_PEPPER);
  const id = newId("usr");
  const now = nowIso();
  await c.env.DB.prepare(
    `INSERT INTO users (id, email, name, role, password_hash, password_salt, active, must_change_password, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, 1, 1, ?, ?)`
  )
    .bind(id, userEmail, name, role(body.role), hash, salt, now, now)
    .run();
  await logActivity(c, "user.create", "user", id, `${name} (${body.role})`);
  const row = await c.env.DB.prepare("SELECT * FROM users WHERE id = ?").bind(id).first();
  return c.json({ user: publicUser(row) }, 201);
});

users.put("/:id", async (c) => {
  const id = c.req.param("id");
  const me = c.get("user");
  const row = await c.env.DB.prepare("SELECT * FROM users WHERE id = ?").bind(id).first();
  if (!row) fail(404, "User not found.");
  const body = await c.req.json();
  const name = text(body.name ?? row.name, "Name", { required: true, max: 80 });
  const newRole = role(body.role ?? row.role);
  const active = body.active === undefined ? row.active : bool(body.active);

  const losesAdmin = row.role === "admin" && row.active && (newRole !== "admin" || !active);
  if (losesAdmin && id === me.id) fail(400, "You can't remove your own admin access. Ask another admin.");
  if (losesAdmin && (await activeAdminCount(c.env.DB)) <= 1) fail(400, "There must be at least one active admin.");

  const statements = [
    c.env.DB.prepare("UPDATE users SET name = ?, role = ?, active = ?, updated_at = ? WHERE id = ?").bind(name, newRole, active, nowIso(), id),
  ];
  if (!active) statements.push(c.env.DB.prepare("DELETE FROM sessions WHERE user_id = ?").bind(id));
  await c.env.DB.batch(statements);
  await logActivity(c, "user.update", "user", id, `${name}: ${newRole}${active ? "" : ", deactivated"}`);
  return c.json({ user: publicUser(await c.env.DB.prepare("SELECT * FROM users WHERE id = ?").bind(id).first()) });
});

users.post("/:id/reset-password", async (c) => {
  const id = c.req.param("id");
  const row = await c.env.DB.prepare("SELECT name FROM users WHERE id = ?").bind(id).first();
  if (!row) fail(404, "User not found.");
  const { hash, salt } = await hashPassword(password((await c.req.json()).password, "Temporary password"), c.env.PASSWORD_PEPPER);
  await c.env.DB.batch([
    c.env.DB.prepare("UPDATE users SET password_hash = ?, password_salt = ?, must_change_password = 1, updated_at = ? WHERE id = ?").bind(
      hash,
      salt,
      nowIso(),
      id
    ),
    c.env.DB.prepare("DELETE FROM sessions WHERE user_id = ?").bind(id),
  ]);
  await logActivity(c, "user.reset-password", "user", id, row.name);
  return c.json({ ok: true });
});

// Permanently removes an account. Their articles and files stay (published ones keep
// their byline) and move to another active user: ?transferTo=<id>, default the admin
// doing the delete. The activity log keeps their name.
users.delete("/:id", async (c) => {
  const id = c.req.param("id");
  const me = c.get("user");
  const db = c.env.DB;
  if (id === me.id) fail(400, "You can't delete your own account. Ask another admin.");
  const row = await db.prepare("SELECT * FROM users WHERE id = ?").bind(id).first();
  if (!row) fail(404, "User not found.");
  if (row.role === "admin" && row.active && (await activeAdminCount(db)) <= 1) fail(400, "There must be at least one active admin.");

  const heirId = c.req.query("transferTo") || me.id;
  const heir = heirId === id ? null : await db.prepare("SELECT id, name FROM users WHERE id = ? AND active = 1").bind(heirId).first();
  if (!heir) fail(400, "Choose an active user to take over their articles.");

  const [articles, files] = await db.batch([
    db.prepare("UPDATE posts SET author_id = ? WHERE author_id = ?").bind(heir.id, id),
    db.prepare("UPDATE media SET uploaded_by = ? WHERE uploaded_by = ?").bind(heir.id, id),
    db.prepare("UPDATE posts SET updated_by = NULL WHERE updated_by = ?").bind(id),
    db.prepare("UPDATE page_seo SET updated_by = NULL WHERE updated_by = ?").bind(id),
    db.prepare("DELETE FROM sessions WHERE user_id = ?").bind(id),
    db.prepare("DELETE FROM users WHERE id = ?").bind(id),
  ]);
  const moved = articles.meta.changes;
  const movedText = moved ? `; ${moved} article${moved === 1 ? "" : "s"} moved to ${heir.name}` : "";
  await logActivity(c, "user.delete", "user", id, `${row.name} (${row.email})${movedText}`);
  return c.json({ ok: true, articlesMoved: moved, filesMoved: files.meta.changes, transferredTo: heir.name });
});

export default users;
