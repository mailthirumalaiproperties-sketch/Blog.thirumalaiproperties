import fs from "node:fs";
import path from "node:path";
import { cache } from "react";
import { parse as parseYaml } from "yaml";
import { marked } from "marked";

// Posts live in /content/posts as Markdown files with YAML front matter.
// The file name (without .md) becomes the URL: /posts/<file-name>/
const POSTS_DIR = path.join(process.cwd(), "content", "posts");
const FRONT_MATTER = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/;
const WORDS_PER_MINUTE = 200;

export function slugify(text) {
  return String(text)
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function readPostFile(fileName) {
  const slug = fileName.replace(/\.md$/, "");
  const raw = fs.readFileSync(path.join(POSTS_DIR, fileName), "utf8");
  const match = raw.match(FRONT_MATTER);
  if (!match) {
    throw new Error(`content/posts/${fileName} is missing its --- front matter --- block`);
  }

  const data = parseYaml(match[1]) ?? {};
  const body = raw.slice(match[0].length);
  for (const field of ["title", "description", "date", "category"]) {
    if (!data[field]) {
      throw new Error(`content/posts/${fileName} is missing "${field}" in its front matter`);
    }
  }

  const words = body.split(/\s+/).filter(Boolean).length;
  return {
    slug,
    title: data.title,
    description: data.description,
    // YAML parses bare dates as strings here; keep ISO yyyy-mm-dd.
    date: String(data.date).slice(0, 10),
    updated: data.updated ? String(data.updated).slice(0, 10) : null,
    category: data.category,
    categorySlug: slugify(data.category),
    tags: data.tags ?? [],
    cover: data.cover ?? null,
    coverAlt: data.coverAlt ?? data.title,
    author: data.author ?? "Thirumalai Properties",
    draft: data.draft === true,
    readingMinutes: Math.max(1, Math.round(words / WORDS_PER_MINUTE)),
    body,
  };
}

export const getAllPosts = cache(() => {
  return fs
    .readdirSync(POSTS_DIR)
    .filter((f) => f.endsWith(".md"))
    .map(readPostFile)
    .filter((p) => !p.draft)
    .sort((a, b) => (a.date < b.date ? 1 : -1));
});

export function getPost(slug) {
  return getAllPosts().find((p) => p.slug === slug) ?? null;
}

export function renderMarkdown(markdown) {
  return marked.parse(markdown, { gfm: true });
}

export function getCategories() {
  const map = new Map();
  for (const post of getAllPosts()) {
    const entry = map.get(post.categorySlug) ?? { name: post.category, slug: post.categorySlug, count: 0 };
    entry.count += 1;
    map.set(post.categorySlug, entry);
  }
  return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
}

export function getRelatedPosts(post, limit = 2) {
  const others = getAllPosts().filter((p) => p.slug !== post.slug);
  const sameCategory = others.filter((p) => p.categorySlug === post.categorySlug);
  const rest = others.filter((p) => p.categorySlug !== post.categorySlug);
  return [...sameCategory, ...rest].slice(0, limit);
}

export function formatDate(isoDate) {
  return new Date(`${isoDate}T00:00:00Z`).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}
