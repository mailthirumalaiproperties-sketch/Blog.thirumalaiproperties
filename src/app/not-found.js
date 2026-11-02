import Link from "next/link";
import { MAIN_SITE_URL } from "@/lib/site";

export const metadata = {
  title: "Page not found",
  robots: { index: false },
};

export default function NotFound() {
  return (
    <section className="max-w-2xl mx-auto px-4 py-24 text-center">
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-brand-gold">404</p>
      <h1 className="font-serif text-4xl font-bold text-brand-dark mt-4">We couldn&apos;t find that page</h1>
      <p className="text-stone-600 mt-4">The article may have moved. Try the blog home or visit our main website.</p>
      <div className="flex flex-wrap justify-center gap-3 mt-8">
        <Link href="/" className="bg-brand-yellow hover:bg-[#E5B002] text-brand-dark px-5 py-3 rounded-xl font-bold text-sm shadow-md transition">
          Blog Home
        </Link>
        <a href={MAIN_SITE_URL} className="bg-white border border-stone-200 hover:border-brand-gold text-brand-dark px-5 py-3 rounded-xl font-bold text-sm transition">
          Main Website
        </a>
      </div>
    </section>
  );
}
