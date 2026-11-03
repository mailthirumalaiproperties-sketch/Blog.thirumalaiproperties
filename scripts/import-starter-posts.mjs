// One-time import of the starter articles (scripts/starter-content/*.md) into the CMS.
// Usage (PowerShell):
//   $env:CMS_API_URL="https://<worker>.workers.dev"; $env:CMS_EMAIL="you@example.com"; $env:CMS_PASSWORD="..."
//   node import-starter-posts.mjs
// Articles whose URL slug already exists are skipped, so it is safe to re-run.
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { marked } from "marked";
import { parse as parseYaml } from "yaml";

const API = (process.env.CMS_API_URL || "").replace(/\/$/, "");
// CMS_TOKEN (an existing admin session token) can be used instead of email + password.
const { CMS_EMAIL, CMS_PASSWORD, CMS_TOKEN } = process.env;
if (!API || !(CMS_TOKEN || (CMS_EMAIL && CMS_PASSWORD))) {
  console.error("Set CMS_API_URL and either CMS_TOKEN or CMS_EMAIL + CMS_PASSWORD first.");
  process.exit(1);
}
const DIR = join(import.meta.dirname, "starter-content");

let token = "";
async function call(method, path, { body, form } = {}) {
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  const init = { method, headers };
  if (form) init.body = form;
  else if (body) {
    headers["Content-Type"] = "application/json";
    init.body = JSON.stringify(body);
  }
  const res = await fetch(API + path, init);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`${method} ${path}: ${res.status} ${data.error || ""}`);
  return data;
}

token = CMS_TOKEN || (await call("POST", "/api/auth/login", { body: { email: CMS_EMAIL, password: CMS_PASSWORD } })).token;
const categories = (await call("GET", "/api/categories")).categories;
const existing = new Set((await call("GET", "/api/posts")).posts.map((p) => p.slug));

for (const file of readdirSync(DIR).filter((f) => f.endsWith(".md")).sort()) {
  const slug = file.replace(/\.md$/, "");
  if (existing.has(slug)) {
    console.log(`skip   ${slug} (already exists)`);
    continue;
  }
  const raw = readFileSync(join(DIR, file), "utf8");
  const [, front, body] = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  const meta = parseYaml(front);
  const category = categories.find((c) => c.name === meta.category);

  let coverMediaId = null;
  if (meta.cover) {
    const coverFile = meta.cover.split("/").pop();
    const form = new FormData();
    form.append("file", new Blob([readFileSync(join(DIR, "covers", coverFile))], { type: "image/webp" }), coverFile);
    form.append("alt", meta.coverAlt || "");
    form.append("width", "1024");
    form.append("height", "800");
    coverMediaId = (await call("POST", "/api/media", { form })).media.id;
  }

  // Internal links pointed at the old blog subdomain; articles now live under /blog/.
  const contentHtml = marked.parse(body, { gfm: true }).replace(/href="\/posts\//g, 'href="/blog/');
  const { post } = await call("POST", "/api/posts", {
    body: {
      title: meta.title,
      slug,
      excerpt: meta.description,
      contentHtml,
      coverMediaId,
      coverAlt: meta.coverAlt || "",
      categoryId: category?.id || "",
      tags: meta.tags || [],
      authorName: "Thirumalai Properties",
      seoDescription: meta.description,
    },
  });
  await call("POST", `/api/posts/${post.id}/publish`);
  console.log(`added  ${slug}`);
}
console.log("Done. The website rebuild has been triggered.");
