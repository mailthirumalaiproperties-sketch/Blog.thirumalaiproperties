const encoder = new TextEncoder();

// PBKDF2 iterations are kept modest because the Workers free plan allows
// ~10 ms CPU per request. A server-side pepper (PASSWORD_PEPPER secret) plus
// login rate limiting compensate: a leaked database alone cannot be cracked.
const PBKDF2_ITERATIONS = 10000;

export function base64url(bytes) {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64url(text) {
  const padded = text.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(text.length / 4) * 4, "=");
  return Uint8Array.from(atob(padded), (c) => c.charCodeAt(0));
}

export function randomToken(bytes = 32) {
  return base64url(crypto.getRandomValues(new Uint8Array(bytes)));
}

export function newId(prefix) {
  return `${prefix}_${randomToken(12)}`;
}

export async function sha256Hex(text) {
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(text));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function pepper(password, pepperSecret) {
  if (!pepperSecret) throw new Error("PASSWORD_PEPPER secret is not configured");
  const key = await crypto.subtle.importKey("raw", encoder.encode(pepperSecret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return new Uint8Array(await crypto.subtle.sign("HMAC", key, encoder.encode(password)));
}

async function derive(password, pepperSecret, salt, iterations) {
  const key = await crypto.subtle.importKey("raw", await pepper(password, pepperSecret), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt, iterations }, key, 256);
  return base64url(new Uint8Array(bits));
}

export async function hashPassword(password, pepperSecret) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await derive(password, pepperSecret, salt, PBKDF2_ITERATIONS);
  return { hash: `pbkdf2-sha256$${PBKDF2_ITERATIONS}$${hash}`, salt: base64url(salt) };
}

export async function verifyPassword(password, pepperSecret, stored, saltText) {
  const [scheme, iterations, expected] = stored.split("$");
  if (scheme !== "pbkdf2-sha256") return false;
  const actual = await derive(password, pepperSecret, fromBase64url(saltText), Number(iterations));
  return timingSafeEqual(actual, expected);
}

function timingSafeEqual(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
