import { CONTACT, MAIN_SITE_URL } from "@/lib/site";

// Call-to-action shown inside every article, sending readers to the main site.
export default function CtaBox() {
  return (
    <aside className="not-prose my-12 rounded-2xl bg-brand-cream border border-brand-gold/30 p-6 sm:p-8">
      <p className="text-xs font-bold uppercase tracking-[0.15em] text-brand-gold">Thirumalai Properties</p>
      <h2 className="font-serif text-2xl font-bold text-brand-dark mt-2">
        Need help with a property in Pondicherry?
      </h2>
      <p className="text-stone-700 mt-3 leading-relaxed">
        We help with buying and selling plots, villas and land, document writing and registration, and managing
        property for NRIs. Talk to our team before you commit.
      </p>
      <div className="flex flex-wrap gap-3 mt-6">
        <a
          href={MAIN_SITE_URL}
          className="bg-brand-yellow hover:bg-[#E5B002] text-brand-dark px-5 py-3 rounded-xl font-bold text-sm shadow-md transition"
        >
          View Properties
        </a>
        <a
          href={CONTACT.whatsapp}
          target="_blank"
          rel="noopener noreferrer"
          className="bg-white border border-stone-200 hover:border-brand-gold text-brand-dark px-5 py-3 rounded-xl font-bold text-sm transition"
        >
          WhatsApp Us
        </a>
        <a
          href={`tel:${CONTACT.phones[0].tel}`}
          className="bg-white border border-stone-200 hover:border-brand-gold text-brand-dark px-5 py-3 rounded-xl font-bold text-sm transition"
        >
          Call {CONTACT.phones[0].display}
        </a>
      </div>
    </aside>
  );
}
