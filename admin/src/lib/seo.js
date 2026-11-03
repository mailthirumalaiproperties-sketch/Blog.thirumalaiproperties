import { htmlToText, slugify } from "./format.js";

export const TITLE_RANGE = [30, 60];
export const DESCRIPTION_RANGE = [120, 160];

/** The <title> the main website will use for a blog post. */
export function effectivePostTitle(post, titleSuffix = " | Thirumalai Properties") {
  return post.seoTitle?.trim() || `${post.title || "Untitled"}${titleSuffix}`;
}

export function effectiveDescription(post) {
  return post.seoDescription?.trim() || post.excerpt?.trim() || "";
}

export function lengthTone(length, [min, max]) {
  if (!length) return "text-stone-400";
  if (length < min || length > max + 10) return "text-red-600";
  if (length > max) return "text-amber-600";
  return "text-green-700";
}

/** Simple on-page SEO checklist for a blog post. */
export function postSeoChecks(post, titleSuffix) {
  const title = effectivePostTitle(post, titleSuffix);
  const description = effectiveDescription(post);
  const html = post.contentHtml || "";
  const text = htmlToText(html);
  const words = text ? text.split(" ").length : 0;
  const keyword = (post.focusKeyword || "").trim().toLowerCase();
  const firstParagraph = htmlToText((html.match(/<p[^>]*>([\s\S]*?)<\/p>/i) || [])[1] || "").toLowerCase();
  const imagesWithoutAlt = (html.match(/<img\b(?![^>]*\balt="[^"]+")[^>]*>/gi) || []).length;

  const checks = [
    { label: `Title is ${TITLE_RANGE[0]}–${TITLE_RANGE[1]} characters (now ${title.length})`, ok: title.length >= TITLE_RANGE[0] && title.length <= TITLE_RANGE[1] + 5 },
    {
      label: `Meta description is ${DESCRIPTION_RANGE[0]}–${DESCRIPTION_RANGE[1]} characters (now ${description.length})`,
      ok: description.length >= DESCRIPTION_RANGE[0] && description.length <= DESCRIPTION_RANGE[1] + 5,
    },
    { label: "Focus keyword is set", ok: Boolean(keyword) },
    { label: "Focus keyword appears in the title", ok: Boolean(keyword) && title.toLowerCase().includes(keyword) },
    { label: "Focus keyword appears in the meta description", ok: Boolean(keyword) && description.toLowerCase().includes(keyword) },
    { label: "Focus keyword appears in the URL", ok: Boolean(keyword) && (post.slug || slugify(post.title)).includes(slugify(keyword)) },
    { label: "Focus keyword appears in the first paragraph", ok: Boolean(keyword) && firstParagraph.includes(keyword) },
    { label: `At least 300 words (now ${words})`, ok: words >= 300 },
    { label: "Uses subheadings (Heading 2 / Heading 3)", ok: /<h[23][\s>]/i.test(html) },
    { label: "Cover image has a description", ok: Boolean(post.coverMediaId && post.coverAlt?.trim()) },
    { label: "Every image in the article has a description", ok: imagesWithoutAlt === 0 },
    { label: "Links to the main website or another article", ok: /href="(https:\/\/(www\.)?thirumalaiproperties\.com|\/)/i.test(html) },
  ];
  return { checks, score: Math.round((checks.filter((c) => c.ok).length / checks.length) * 100), words };
}
