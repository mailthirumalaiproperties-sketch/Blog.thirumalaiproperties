import { getAllPosts, getCategories } from "@/lib/posts";
import { SITE_URL } from "@/lib/site";

export const dynamic = "force-static";

export default function sitemap() {
  const posts = getAllPosts();
  return [
    { url: `${SITE_URL}/`, lastModified: posts[0]?.updated ?? posts[0]?.date, changeFrequency: "weekly", priority: 1 },
    ...posts.map((p) => ({
      url: `${SITE_URL}/posts/${p.slug}/`,
      lastModified: p.updated ?? p.date,
      changeFrequency: "monthly",
      priority: 0.8,
    })),
    ...getCategories().map((c) => ({
      url: `${SITE_URL}/category/${c.slug}/`,
      changeFrequency: "weekly",
      priority: 0.5,
    })),
  ];
}
