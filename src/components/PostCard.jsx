import Image from "next/image";
import Link from "next/link";
import { formatDate } from "@/lib/posts";

export default function PostCard({ post, featured = false }) {
  return (
    <article
      className={`group bg-white rounded-2xl border border-stone-100 shadow-sm hover:shadow-lg transition-shadow overflow-hidden flex ${
        featured ? "flex-col lg:flex-row" : "flex-col"
      }`}
    >
      {post.cover && (
        <Link
          href={`/posts/${post.slug}/`}
          tabIndex={-1}
          aria-hidden="true"
          className={`block bg-brand-cream overflow-hidden ${featured ? "lg:w-1/2" : ""}`}
        >
          <Image
            src={post.cover}
            alt={post.coverAlt}
            width={1024}
            height={800}
            className={`w-full object-cover group-hover:scale-[1.03] transition-transform duration-500 ${
              featured ? "h-60 lg:h-full" : "h-52"
            }`}
          />
        </Link>
      )}
      <div className={`flex flex-col flex-1 p-6 ${featured ? "lg:p-10 lg:justify-center" : ""}`}>
        <Link
          href={`/category/${post.categorySlug}/`}
          className="self-start text-xs font-bold uppercase tracking-[0.15em] text-brand-gold hover:text-brand-dark transition"
        >
          {post.category}
        </Link>
        <h3 className={`font-serif font-bold text-brand-dark mt-3 leading-snug ${featured ? "text-2xl md:text-3xl" : "text-xl"}`}>
          <Link href={`/posts/${post.slug}/`} className="hover:text-brand-gold transition">
            {post.title}
          </Link>
        </h3>
        <p className="text-stone-600 mt-3 leading-relaxed flex-1">{post.description}</p>
        <p className="text-xs font-semibold text-stone-500 mt-5">
          <time dateTime={post.date}>{formatDate(post.date)}</time> · {post.readingMinutes} min read
        </p>
      </div>
    </article>
  );
}
