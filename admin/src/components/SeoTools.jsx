import { SITE_URL } from "../lib/api.js";

/** Approximates how the page will look in Google search results. */
export function GooglePreview({ title, description, path }) {
  const crumbs = path.split("/").filter(Boolean);
  const clip = (s, n) => (s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s);
  return (
    <div className="rounded-lg border border-stone-200 bg-white p-4 font-[Arial,sans-serif]">
      <p className="text-xs text-stone-500 mb-1">Google preview</p>
      <div className="flex items-center gap-2">
        <span className="h-7 w-7 rounded-full bg-brand-cream border border-stone-200 flex items-center justify-center text-[10px] font-bold text-brand-gold">TP</span>
        <div className="leading-tight min-w-0">
          <p className="text-sm text-[#202124] truncate">Thirumalai Properties</p>
          <p className="text-xs text-[#4d5156] truncate">
            {SITE_URL}
            {crumbs.length ? ` › ${crumbs.join(" › ")}` : ""}
          </p>
        </div>
      </div>
      <p className="text-[#1a0dab] text-lg leading-snug mt-2 break-words">{clip(title || "Page title", 62)}</p>
      <p className="text-sm text-[#4d5156] leading-snug mt-1 break-words">
        {description ? clip(description, 160) : <span className="italic text-stone-400">Add a meta description — otherwise Google picks text from the page.</span>}
      </p>
    </div>
  );
}

export function SeoChecklist({ checks, score }) {
  const tone = score >= 80 ? "bg-green-600" : score >= 50 ? "bg-amber-500" : "bg-red-500";
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm font-semibold text-stone-700">SEO checklist</p>
        <span className="text-sm font-bold text-stone-700">{score}%</span>
      </div>
      <div className="h-2 rounded-full bg-stone-100 overflow-hidden mb-3">
        <div className={`h-full ${tone} transition-all`} style={{ width: `${score}%` }} />
      </div>
      <ul className="space-y-1.5">
        {checks.map((c) => (
          <li key={c.label} className="flex items-start gap-2 text-xs">
            <span className={`mt-px font-bold ${c.ok ? "text-green-600" : "text-stone-300"}`} aria-hidden="true">
              {c.ok ? "✓" : "○"}
            </span>
            <span className={c.ok ? "text-stone-600" : "text-stone-800"}>
              <span className="sr-only">{c.ok ? "Done: " : "To do: "}</span>
              {c.label}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
