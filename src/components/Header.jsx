"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import Logo from "./Logo";
import { CONTACT, MAIN_SITE_URL } from "@/lib/site";

const PhoneIcon = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor" aria-hidden="true">
    <path d="M20 15.5c-1.25 0-2.45-.2-3.57-.57a1 1 0 00-1.02.24l-2.2 2.2a15.1 15.1 0 01-6.59-6.59l2.2-2.2a1 1 0 00.25-1.02A11.36 11.36 0 008.5 4c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1 0 9.39 7.61 17 17 17 .55 0 1-.45 1-1v-3.5c0-.55-.45-1-1-1z" />
  </svg>
);

export default function Header({ categories }) {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  const navItems = [
    { name: "All Articles", href: "/" },
    ...categories.map((c) => ({ name: c.name, href: `/category/${c.slug}/` })),
  ];
  const isActive = (href) =>
    href === "/" ? pathname === "/" : pathname?.startsWith(href.replace(/\/$/, ""));

  return (
    <header className="sticky top-0 z-50 w-full bg-white/90 backdrop-blur-md border-b border-stone-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20 md:h-24">
          <Link href="/" aria-label="Thirumalai Properties Blog home" className="py-1">
            <Logo />
          </Link>

          <nav className="hidden lg:flex lg:space-x-7" aria-label="Blog">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`relative text-sm font-semibold tracking-wide py-2 transition-colors ${
                  isActive(item.href) ? "text-brand-yellow" : "text-stone-700 hover:text-brand-gold"
                }`}
              >
                {item.name}
                {isActive(item.href) && (
                  <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-6 h-[3px] bg-brand-yellow rounded-full" />
                )}
              </Link>
            ))}
          </nav>

          <div className="hidden lg:flex items-center gap-3">
            <a
              href={MAIN_SITE_URL}
              className="text-sm font-bold text-brand-dark border border-brand-gold/40 hover:border-brand-gold hover:bg-brand-cream px-5 py-2.5 rounded-xl transition"
            >
              Main Website
            </a>
            <a
              href={`tel:${CONTACT.phones[0].tel}`}
              className="flex items-center gap-2.5 bg-brand-yellow hover:bg-[#E5B002] active:scale-95 text-brand-dark px-5 py-2.5 rounded-xl font-bold tracking-wide shadow-md transition"
            >
              <PhoneIcon />
              <span>{CONTACT.phones[0].display}</span>
            </a>
          </div>

          <button
            onClick={() => setIsOpen(!isOpen)}
            type="button"
            className="lg:hidden inline-flex items-center justify-center p-2 rounded-lg text-stone-700 hover:text-brand-gold hover:bg-stone-50 transition"
            aria-controls="mobile-menu"
            aria-expanded={isOpen}
          >
            <span className="sr-only">{isOpen ? "Close menu" : "Open menu"}</span>
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" aria-hidden="true">
              {isOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>
      </div>

      <div
        id="mobile-menu"
        className={`lg:hidden overflow-hidden transition-all duration-300 ${isOpen ? "max-h-[32rem] opacity-100" : "max-h-0 opacity-0"}`}
      >
        <div className="px-4 pt-2 pb-6 space-y-2 bg-white border-t border-stone-100">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setIsOpen(false)}
              className={`block px-4 py-3 rounded-lg text-base font-semibold ${
                isActive(item.href) ? "bg-amber-50 text-brand-yellow" : "text-stone-700 hover:bg-stone-50"
              }`}
            >
              {item.name}
            </Link>
          ))}
          <a href={MAIN_SITE_URL} className="block px-4 py-3 rounded-lg text-base font-semibold text-stone-700 hover:bg-stone-50">
            Main Website →
          </a>
          <div className="pt-4 border-t border-stone-100">
            <a
              href={`tel:${CONTACT.phones[0].tel}`}
              className="flex items-center justify-center gap-2.5 bg-brand-yellow text-brand-dark px-6 py-4 rounded-xl font-bold shadow-md"
            >
              <PhoneIcon />
              <span>{CONTACT.phones[0].display}</span>
            </a>
          </div>
        </div>
      </div>
    </header>
  );
}
