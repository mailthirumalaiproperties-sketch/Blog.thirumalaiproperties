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
  const { results } = await c.env.DB.prepare("SELECT * FROM users ORDER BY active DESC, name").all();
  return c.json({ users: results.map(publicUser) });
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

export default users;
