import Link from "next/link";
import Logo from "./Logo";
import { CONTACT, MAIN_SITE_URL, SERVICES, SOCIALS } from "@/lib/site";

export default function Footer({ categories }) {
  return (
    <footer className="w-full mt-auto">
      {/* Gold CTA banner, same as the main website */}
      <div className="w-full bg-gradient-to-r from-[#F5BC04] via-[#F4B400] to-[#E5A900] py-6 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <h2 className="font-serif text-2xl sm:text-3xl font-extrabold text-brand-dark text-center md:text-left">
            Looking to buy, sell or register a property?
          </h2>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <a
              href={MAIN_SITE_URL}
              className="bg-brand-dark text-white hover:bg-black px-6 py-3 rounded-xl font-extrabold text-sm tracking-wide shadow-md transition"
            >
              View Properties
            </a>
            <a
              href={`tel:${CONTACT.phones[0].tel}`}
              className="bg-white text-brand-dark hover:bg-stone-50 px-6 py-3 rounded-xl font-extrabold text-sm tracking-wide shadow-md transition"
            >
              Call Now
            </a>
            <a
              href={CONTACT.whatsapp}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-white text-brand-dark hover:bg-stone-50 px-6 py-3 rounded-xl font-extrabold text-sm tracking-wide shadow-md transition"
            >
              WhatsApp Us
            </a>
          </div>
        </div>
      </div>

      <div className="w-full bg-brand-gold py-10 px-4 sm:px-6 lg:px-8 text-brand-dark">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
          <div className="flex flex-col items-start">
            <Link href="/" aria-label="Blog home" className="mb-4">
              <Logo variant="dark" />
            </Link>
            <p className="text-sm font-semibold leading-relaxed max-w-[280px]">
              Your trusted partner in real estate, documentation services and NRI property management in Pondicherry.
            </p>
            <div className="flex gap-4 mt-5 text-sm font-bold">
              {SOCIALS.map((s) => (
                <a key={s.label} href={s.href} target="_blank" rel="noopener noreferrer" className="hover:text-white transition">
                  {s.label}
                </a>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-base font-extrabold mb-5 uppercase tracking-wide">Blog Topics</h3>
            <ul className="space-y-3 text-sm font-semibold">
              <li>
                <Link href="/" className="hover:text-white transition">All Articles</Link>
              </li>
              {categories.map((c) => (
                <li key={c.slug}>
                  <Link href={`/category/${c.slug}/`} className="hover:text-white transition">
                    {c.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-base font-extrabold mb-5 uppercase tracking-wide">Our Services</h3>
            <ul className="space-y-3 text-sm font-semibold">
              {SERVICES.map((s) => (
                <li key={s}>
                  <a href={MAIN_SITE_URL} className="hover:text-white transition">{s}</a>
                </li>
              ))}
              <li>
                <a href={MAIN_SITE_URL} className="hover:text-white transition">thirumalaiproperties.com →</a>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-base font-extrabold mb-5 uppercase tracking-wide">Contact Us</h3>
            <ul className="space-y-3 text-sm font-semibold">
              <li>{CONTACT.address}</li>
              {CONTACT.phones.map((p) => (
                <li key={p.tel}>
                  <a href={`tel:${p.tel}`} className="hover:text-white transition">{p.display}</a>
                </li>
              ))}
              <li>
                <a href={`mailto:${CONTACT.email}`} className="hover:text-white transition break-all">{CONTACT.email}</a>
              </li>
            </ul>
          </div>
        </div>

        <div className="max-w-7xl mx-auto border-t border-brand-dark/10 mt-8 pt-4 text-xs font-semibold flex flex-col sm:flex-row justify-between gap-2">
          <span>© {new Date().getFullYear()} THIRUMALAI PROPERTIES.</span>
          <span>Articles are general information, not legal or financial advice.</span>
        </div>
      </div>
    </footer>
  );
}
