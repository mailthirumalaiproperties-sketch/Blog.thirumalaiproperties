import Link from "next/link";
import { notFound } from "next/navigation";
import PostCard from "@/components/PostCard";
import { getAllPosts, getCategories } from "@/lib/posts";

export const dynamicParams = false;

export function generateStaticParams() {
  return getCategories().map((c) => ({ category: c.slug }));
}

export async function generateMetadata({ params }) {
  const { category } = await params;
  const match = getCategories().find((c) => c.slug === category);
  if (!match) return {};
  return {
    title: match.name,
    description: `${match.name} articles from Thirumalai Properties: real estate advice for Pondicherry and Puducherry.`,
    alternates: { canonical: `/category/${match.slug}/` },
  };
}

export default async function CategoryPage({ params }) {
  const { category } = await params;
  const match = getCategories().find((c) => c.slug === category);
  if (!match) notFound();

  const posts = getAllPosts().filter((p) => p.categorySlug === category);

  return (
    <>
      <section className="bg-brand-cream border-b border-stone-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
          <nav aria-label="Breadcrumb" className="text-sm font-semibold text-stone-500">
            <Link href="/" className="hover:text-brand-gold">Blog</Link>
            <span className="mx-2">/</span>
            <span>{match.name}</span>
          </nav>
          <h1 className="font-serif text-4xl font-bold text-brand-dark mt-4">{match.name}</h1>
          <p className="text-stone-600 mt-3">
            {match.count} {match.count === 1 ? "article" : "articles"}
          </p>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {posts.map((post) => (
            <PostCard key={post.slug} post={post} />
          ))}
        </div>
      </section>
    </>
  );
}
