import Link from "next/link";
import PostCard from "@/components/PostCard";
import { getAllPosts, getCategories } from "@/lib/posts";
import { MAIN_SITE_URL } from "@/lib/site";

export default function BlogHome() {
  const [featured, ...rest] = getAllPosts();
  const categories = getCategories();

  return (
    <>
      <section className="bg-brand-cream border-b border-stone-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 md:py-20 text-center">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-brand-gold">Thirumalai Properties Blog</p>
          <h1 className="font-serif text-4xl md:text-5xl font-bold text-brand-dark mt-4 leading-tight">
            Property Guides for Pondicherry
          </h1>
          <p className="max-w-2xl mx-auto text-lg text-stone-600 mt-5 leading-relaxed">
            Practical advice on buying land and homes, registering documents, NRI property ownership and the local
            real estate market in Puducherry.
          </p>
          <div className="flex flex-wrap justify-center gap-3 mt-8">
            {categories.map((c) => (
              <Link
                key={c.slug}
                href={`/category/${c.slug}/`}
                className="px-4 py-2 rounded-full bg-white border border-stone-200 text-sm font-semibold text-stone-700 hover:border-brand-gold hover:text-brand-dark transition"
              >
                {c.name} <span className="text-stone-400">({c.count})</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        {featured ? (
          <>
            <h2 className="sr-only">Latest article</h2>
            <PostCard post={featured} featured />
          </>
        ) : (
          <p className="text-center text-stone-500">New articles are on their way. Check back soon.</p>
        )}

        {rest.length > 0 && (
          <>
            <h2 className="font-serif text-2xl font-bold text-brand-dark mt-16 mb-8">More Articles</h2>
            <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {rest.map((post) => (
                <PostCard key={post.slug} post={post} />
              ))}
            </div>
          </>
        )}

        <div className="mt-16 text-center">
          <a href={MAIN_SITE_URL} className="font-bold text-brand-gold hover:text-brand-dark transition">
            Browse available plots, villas and land on thirumalaiproperties.com →
          </a>
        </div>
      </section>
    </>
  );
}
