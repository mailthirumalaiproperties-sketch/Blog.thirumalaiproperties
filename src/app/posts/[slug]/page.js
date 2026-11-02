import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import CtaBox from "@/components/CtaBox";
import PostCard from "@/components/PostCard";
import { formatDate, getAllPosts, getPost, getRelatedPosts, renderMarkdown } from "@/lib/posts";
import { MAIN_SITE_URL, SITE_NAME, SITE_URL } from "@/lib/site";

// Only the posts that exist at build time are published.
export const dynamicParams = false;

export function generateStaticParams() {
  return getAllPosts().map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) return {};
  return {
    title: post.title,
    description: post.description,
    alternates: { canonical: `/posts/${post.slug}/` },
    openGraph: {
      type: "article",
      title: post.title,
      description: post.description,
      url: `/posts/${post.slug}/`,
      publishedTime: post.date,
      modifiedTime: post.updated ?? post.date,
      images: post.cover ? [{ url: post.cover, alt: post.coverAlt }] : undefined,
    },
  };
}

export default async function PostPage({ params }) {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) notFound();

  const related = getRelatedPosts(post);
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.description,
    datePublished: post.date,
    dateModified: post.updated ?? post.date,
    author: { "@type": "Organization", name: post.author, url: MAIN_SITE_URL },
    publisher: { "@type": "Organization", name: "Thirumalai Properties", url: MAIN_SITE_URL },
    mainEntityOfPage: `${SITE_URL}/posts/${post.slug}/`,
    image: post.cover ? `${SITE_URL}${post.cover}` : undefined,
    isPartOf: { "@type": "Blog", name: SITE_NAME, url: SITE_URL },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />

      <article className="max-w-3xl mx-auto px-4 sm:px-6 py-10 md:py-14">
        <nav aria-label="Breadcrumb" className="text-sm font-semibold text-stone-500">
          <Link href="/" className="hover:text-brand-gold">Blog</Link>
          <span className="mx-2">/</span>
          <Link href={`/category/${post.categorySlug}/`} className="hover:text-brand-gold">{post.category}</Link>
        </nav>

        <header className="mt-6">
          <h1 className="font-serif text-3xl md:text-5xl font-bold text-brand-dark leading-tight">{post.title}</h1>
          <p className="text-lg text-stone-600 mt-5 leading-relaxed">{post.description}</p>
          <p className="text-sm font-semibold text-stone-500 mt-5">
            By {post.author} · <time dateTime={post.date}>{formatDate(post.date)}</time>
            {post.updated && (
              <>
                {" "}· Updated <time dateTime={post.updated}>{formatDate(post.updated)}</time>
              </>
            )}{" "}
            · {post.readingMinutes} min read
          </p>
        </header>

        {post.cover && (
          <Image
            src={post.cover}
            alt={post.coverAlt}
            width={1024}
            height={800}
            priority
            className="w-full h-auto max-h-[28rem] object-cover rounded-2xl mt-8 bg-brand-cream"
          />
        )}

        <div
          className="prose prose-lg prose-brand max-w-none mt-10"
          dangerouslySetInnerHTML={{ __html: renderMarkdown(post.body) }}
        />

        <CtaBox />
      </article>

      {related.length > 0 && (
        <section className="bg-brand-cream border-t border-stone-100">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
            <h2 className="font-serif text-2xl font-bold text-brand-dark mb-8">Keep Reading</h2>
            <div className="grid gap-8 sm:grid-cols-2">
              {related.map((p) => (
                <PostCard key={p.slug} post={p} />
              ))}
            </div>
          </div>
        </section>
      )}
    </>
  );
}
