import { useState } from "react";
import { SITE_URL } from "../lib/api.js";
import { ROLE_LABELS, useAuth } from "../lib/auth.jsx";
import { Link, useRouter } from "../lib/router.jsx";

const NAV = [
  { to: "/", label: "Dashboard", icon: "M3 12l9-9 9 9M5 10v10h5v-6h4v6h5V10" },
  { to: "/articles", label: "Articles", icon: "M7 4h10a2 2 0 012 2v14l-4-2-4 2-4-2-4 2V6a2 2 0 012-2zM9 8h6M9 12h6" },
  { to: "/categories", label: "Categories", icon: "M4 6h16M4 12h16M4 18h10" },
  { to: "/media", label: "Images & files", icon: "M4 5h16v14H4zM4 15l4-4 4 4 3-3 5 5M15 9h.01" },
  { to: "/seo", label: "SEO", icon: "M11 4a7 7 0 105.2 11.7L21 20.5M8 11h6M11 8v6" },
  { to: "/settings", label: "Site settings", icon: "M12 8a4 4 0 100 8 4 4 0 000-8zM4 12h2M18 12h2M12 4v2M12 18v2", permission: "settings.manage" },
  { to: "/users", label: "Users", icon: "M16 11a4 4 0 10-8 0 4 4 0 008 0zM4 20a8 8 0 0116 0", permission: "users.manage" },
  { to: "/activity", label: "Activity", icon: "M4 12h4l3-8 4 16 3-8h2", permission: "activity.view" },
];

function Icon({ d }) {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={d} />
    </svg>
  );
}

export default function Layout({ children }) {
  const { user, logout, can } = useAuth();
  const { path } = useRouter();
  const [open, setOpen] = useState(false);
  const isActive = (to) => (to === "/" ? path === "/" : path === to || path.startsWith(`${to}/`));

  const nav = (
    <nav className="flex flex-col gap-1 p-3">
      {NAV.filter((item) => !item.permission || can(item.permission)).map((item) => (
        <Link
          key={item.to}
          to={item.to}
          onClick={() => setOpen(false)}
          className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition ${
            isActive(item.to) ? "bg-brand-yellow text-brand-dark" : "text-stone-300 hover:bg-white/10 hover:text-white"
          }`}
        >
          <Icon d={item.icon} />
          {item.label}
        </Link>
      ))}
    </nav>
  );

  return (
    <div className="min-h-screen lg:flex">
      {/* Sidebar */}
      <aside className={`${open ? "block" : "hidden"} lg:block lg:w-64 lg:shrink-0 bg-brand-dark lg:min-h-screen lg:sticky lg:top-0 lg:h-screen lg:overflow-y-auto`}>
        <div className="hidden lg:block px-6 pt-6 pb-4 border-b border-white/10">
          <p className="font-serif text-xl font-bold tracking-[0.12em] text-brand-yellow">THIRUMALAI</p>
          <p className="text-[10px] font-bold tracking-[0.3em] text-white/70 mt-1">BLOG ADMIN</p>
        </div>
        {nav}
        <div className="p-3 mt-2 border-t border-white/10">
          <a href={`${SITE_URL}/blog/`} target="_blank" rel="noopener noreferrer" className="block rounded-lg px-3 py-2 text-sm font-semibold text-stone-300 hover:text-white hover:bg-white/10">
            View live blog ↗
          </a>
        </div>
      </aside>

      <div className="flex-1 min-w-0">
        <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-stone-200">
          <div className="flex items-center justify-between gap-3 px-4 sm:px-6 lg:px-8 h-16">
            <div className="flex items-center gap-3">
              <button type="button" className="lg:hidden p-2 -ml-2 rounded-lg hover:bg-stone-100" onClick={() => setOpen(!open)} aria-label="Toggle menu" aria-expanded={open}>
                <Icon d="M4 6h16M4 12h16M4 18h16" />
              </button>
              <span className="lg:hidden font-serif font-bold tracking-[0.1em] text-brand-gold">THIRUMALAI</span>
            </div>
            <div className="flex items-center gap-2 sm:gap-4">
              <Link to="/account" className="text-right leading-tight hover:opacity-80">
                <span className="block text-sm font-semibold text-stone-800">{user.name}</span>
                <span className="block text-xs text-stone-500">{ROLE_LABELS[user.role]}</span>
              </Link>
              <button type="button" onClick={logout} className="text-sm font-semibold text-stone-500 hover:text-red-700 px-2 py-1">
                Log out
              </button>
            </div>
          </div>
        </header>
        <main className="px-4 sm:px-6 lg:px-8 py-6 lg:py-8 max-w-7xl">{children}</main>
      </div>
    </div>
  );
}
