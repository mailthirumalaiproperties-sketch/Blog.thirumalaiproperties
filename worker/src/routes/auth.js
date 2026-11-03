import { Hono } from "hono";
import { hashPassword, newId, randomToken, sha256Hex, verifyPassword } from "../lib/crypto.js";
import { publicUser, requireAuth, SESSION_HOURS } from "../lib/auth.js";
import { email, fail, logActivity, nowIso, password, text } from "../lib/util.js";

// Lock an email+network pair after 5 failures (stops password guessing) and a
// whole network only after 30 (so one typo-prone colleague in a shared office
// can't lock everyone out, and an attacker can't lock out a known email).
const LIMITS = { pair: 5, ip: 30 };
const WINDOW_MS = 15 * 60 * 1000;
const LOCK_MS = 15 * 60 * 1000;
const limitFor = (key) => LIMITS[key.split(":")[0]] ?? 5;

const auth = new Hono();

async function createSession(c, userId) {
  const token = randomToken(32);
  const expires = new Date(Date.now() + SESSION_HOURS * 3600 * 1000).toISOString();
  await c.env.DB.batch([
    c.env.DB.prepare("DELETE FROM sessions WHERE expires_at <= ?").bind(nowIso()),
    c.env.DB.prepare("INSERT INTO sessions (token_hash, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)").bind(
      await sha256Hex(token),
      userId,
      nowIso(),
      expires
    ),
  ]);
  return { token, expiresAt: expires };
}

async function lockedUntil(db, keys) {
  const now = Date.now();
  let until = 0;
  for (const key of keys) {
    const row = await db.prepare("SELECT locked_until FROM login_attempts WHERE key = ?").bind(key).first();
    if (row && row.locked_until > now) until = Math.max(until, row.locked_until);
  }
  return until;
}

async function recordFailure(db, keys) {
  const now = Date.now();
  for (const key of keys) {
    const row = await db.prepare("SELECT failures, window_start FROM login_attempts WHERE key = ?").bind(key).first();
    const fresh = !row || now - row.window_start > WINDOW_MS;
    const failures = fresh ? 1 : row.failures + 1;
    const locked = failures >= limitFor(key) ? now + LOCK_MS : 0;
    await db
      .prepare(
        `INSERT INTO login_attempts (key, failures, window_start, locked_until) VALUES (?, ?, ?, ?)
         ON CONFLICT(key) DO UPDATE SET failures = excluded.failures, window_start = excluded.window_start, locked_until = excluded.locked_until`
      )
      .bind(key, failures, fresh ? now : row.window_start, locked)
      .run();
  }
}

// --- First-run setup: creates the first admin when no users exist -------------

auth.get("/setup", async (c) => {
  const row = await c.env.DB.prepare("SELECT COUNT(*) AS n FROM users").first();
  return c.json({ needsSetup: row.n === 0 });
});

auth.post("/setup", async (c) => {
  const body = await c.req.json();
  const existing = await c.env.DB.prepare("SELECT COUNT(*) AS n FROM users").first();
  if (existing.n > 0) fail(409, "Setup has already been completed.");
  if (!c.env.SETUP_TOKEN || body.setupToken !== c.env.SETUP_TOKEN) fail(403, "The setup code is not correct.");

  const name = text(body.name, "Name", { required: true, max: 80 });
  const userEmail = email(body.email);
  const { hash, salt } = await hashPassword(password(body.password), c.env.PASSWORD_PEPPER);
  const id = newId("usr");
  const now = nowIso();
  await c.env.DB.prepare(
    `INSERT INTO users (id, email, name, role, password_hash, password_salt, created_at, updated_at, last_login_at)
     VALUES (?, ?, ?, 'admin', ?, ?, ?, ?, ?)`
  )
    .bind(id, userEmail, name, hash, salt, now, now, now)
    .run();

  const user = { id, email: userEmail, name, role: "admin", must_change_password: 0 };
  c.set("user", user);
  await logActivity(c, "setup", "user", id, "Created first admin");
  return c.json({ ...(await createSession(c, id)), user: publicUser(user) }, 201);
});

// --- Login / logout / session --------------------------------------------------

auth.post("/login", async (c) => {
  const body = await c.req.json();
  const userEmail = email(body.email);
  const ip = c.req.header("CF-Connecting-IP") || "local";
  const keys = [`pair:${userEmail}|${ip}`, `ip:${ip}`];

  const until = await lockedUntil(c.env.DB, keys);
  if (until) {
    const minutes = Math.ceil((until - Date.now()) / 60000);
    fail(429, `Too many failed attempts. Try again in ${minutes} minute${minutes === 1 ? "" : "s"}.`);
  }

  const row = await c.env.DB.prepare("SELECT * FROM users WHERE email = ?").bind(userEmail).first();
  const ok = row && row.active && (await verifyPassword(String(body.password ?? ""), c.env.PASSWORD_PEPPER, row.password_hash, row.password_salt));
  if (!ok) {
    await recordFailure(c.env.DB, keys);
    fail(401, "Incorrect email or password.");
  }

  await c.env.DB.batch([
    c.env.DB.prepare("DELETE FROM login_attempts WHERE key IN (?, ?)").bind(...keys),
    c.env.DB.prepare("UPDATE users SET last_login_at = ? WHERE id = ?").bind(nowIso(), row.id),
  ]);
  c.set("user", row);
  await logActivity(c, "login", "user", row.id);
  return c.json({ ...(await createSession(c, row.id)), user: publicUser(row) });
});

auth.post("/logout", requireAuth, async (c) => {
  await c.env.DB.prepare("DELETE FROM sessions WHERE token_hash = ?").bind(c.get("tokenHash")).run();
  return c.json({ ok: true });
});

auth.get("/me", requireAuth, (c) => c.json({ user: publicUser(c.get("user")) }));

auth.post("/password", requireAuth, async (c) => {
  const body = await c.req.json();
  const user = c.get("user");
  const row = await c.env.DB.prepare("SELECT password_hash, password_salt FROM users WHERE id = ?").bind(user.id).first();
  if (!(await verifyPassword(String(body.currentPassword ?? ""), c.env.PASSWORD_PEPPER, row.password_hash, row.password_salt))) {
    fail(400, "Your current password is not correct.");
  }
  const next = password(body.newPassword, "New password");
  if (next === body.currentPassword) fail(400, "Choose a password different from the current one.");
  const { hash, salt } = await hashPassword(next, c.env.PASSWORD_PEPPER);

  // Sign out other devices, keep this session.
  await c.env.DB.batch([
    c.env.DB.prepare("UPDATE users SET password_hash = ?, password_salt = ?, must_change_password = 0, updated_at = ? WHERE id = ?").bind(
      hash,
      salt,
      nowIso(),
      user.id
    ),
    c.env.DB.prepare("DELETE FROM sessions WHERE user_id = ? AND token_hash != ?").bind(user.id, c.get("tokenHash")),
  ]);
  await logActivity(c, "password.change", "user", user.id);
  return c.json({ ok: true });
});

export default auth;
