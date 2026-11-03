import { useEffect, useId } from "react";

const BUTTON_STYLES = {
  primary: "bg-brand-yellow text-brand-dark hover:bg-[#e5b002] shadow-sm",
  dark: "bg-brand-dark text-white hover:bg-black",
  secondary: "bg-white text-stone-800 border border-stone-300 hover:border-brand-gold hover:bg-brand-cream",
  danger: "bg-white text-red-700 border border-red-200 hover:bg-red-50",
  destructive: "bg-red-600 text-white hover:bg-red-700 shadow-sm",
  ghost: "text-stone-600 hover:bg-stone-100",
};

export function Button({ variant = "secondary", size = "md", busy = false, className = "", children, disabled, ...rest }) {
  const sizes = { sm: "px-3 py-1.5 text-xs", md: "px-4 py-2 text-sm", lg: "px-5 py-2.5 text-sm" };
  return (
    <button
      type="button"
      disabled={disabled || busy}
      className={`inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed ${BUTTON_STYLES[variant]} ${sizes[size]} ${className}`}
      {...rest}
    >
      {busy && <Spinner className="h-4 w-4" />}
      {children}
    </button>
  );
}

export function Spinner({ className = "h-5 w-5" }) {
  return (
    <svg className={`animate-spin ${className}`} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" />
      <path d="M22 12a10 10 0 0 0-10-10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

export function Field({ label, hint, counter, error, children, className = "" }) {
  const id = useId();
  return (
    <div className={className}>
      {label && (
        <div className="flex items-baseline justify-between gap-2 mb-1.5">
          <label htmlFor={id} className="text-sm font-semibold text-stone-700">
            {label}
          </label>
          {counter}
        </div>
      )}
      {typeof children === "function" ? children(id) : children}
      {hint && !error && <p className="text-xs text-stone-500 mt-1.5">{hint}</p>}
      {error && <p className="text-xs text-red-600 mt-1.5">{error}</p>}
    </div>
  );
}

const inputClass =
  "w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-800 placeholder:text-stone-400 focus:border-brand-gold focus:outline-none focus:ring-2 focus:ring-brand-yellow/30 disabled:bg-stone-100";

export function Input({ className = "", ...rest }) {
  return <input className={`${inputClass} ${className}`} {...rest} />;
}

export function Textarea({ className = "", rows = 3, ...rest }) {
  return <textarea rows={rows} className={`${inputClass} resize-y ${className}`} {...rest} />;
}

export function Select({ className = "", children, ...rest }) {
  return (
    <select className={`${inputClass} ${className}`} {...rest}>
      {children}
    </select>
  );
}

export function Checkbox({ label, hint, checked, onChange, disabled }) {
  return (
    <label className="flex items-start gap-3 cursor-pointer">
      <input
        type="checkbox"
        className="mt-0.5 h-4 w-4 rounded border-stone-300 accent-[#d29f13]"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span>
        <span className="block text-sm font-semibold text-stone-700">{label}</span>
        {hint && <span className="block text-xs text-stone-500 mt-0.5">{hint}</span>}
      </span>
    </label>
  );
}

const BADGE_TONES = {
  stone: "bg-stone-100 text-stone-700",
  amber: "bg-amber-100 text-amber-800",
  green: "bg-green-100 text-green-800",
  red: "bg-red-100 text-red-700",
  blue: "bg-sky-100 text-sky-800",
};

export function Badge({ tone = "stone", children }) {
  return <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${BADGE_TONES[tone]}`}>{children}</span>;
}

export function Card({ title, actions, children, className = "", bodyClassName = "p-5" }) {
  return (
    <section className={`bg-white rounded-xl border border-stone-200 shadow-sm ${className}`}>
      {(title || actions) && (
        <header className="flex items-center justify-between gap-3 px-5 py-3.5 border-b border-stone-100">
          <h2 className="text-sm font-bold text-stone-800">{title}</h2>
          {actions}
        </header>
      )}
      <div className={bodyClassName}>{children}</div>
    </section>
  );
}

export function PageHeader({ title, description, actions }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-6">
      <div>
        <h1 className="text-2xl font-bold text-brand-dark">{title}</h1>
        {description && <p className="text-sm text-stone-500 mt-1">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Notice({ tone = "info", children, onClose }) {
  const tones = {
    info: "bg-sky-50 border-sky-200 text-sky-900",
    success: "bg-green-50 border-green-200 text-green-900",
    warning: "bg-amber-50 border-amber-200 text-amber-900",
    error: "bg-red-50 border-red-200 text-red-800",
  };
  if (!children) return null;
  return (
    <div role={tone === "error" ? "alert" : "status"} className={`flex items-start justify-between gap-3 rounded-lg border px-4 py-3 text-sm ${tones[tone]}`}>
      <div>{children}</div>
      {onClose && (
        <button type="button" onClick={onClose} className="opacity-60 hover:opacity-100" aria-label="Dismiss">
          ✕
        </button>
      )}
    </div>
  );
}

export function Modal({ title, open, onClose, children, footer, wide = false }) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div role="dialog" aria-modal="true" aria-label={title} className={`bg-white rounded-xl shadow-xl w-full ${wide ? "max-w-5xl" : "max-w-lg"} max-h-[90vh] flex flex-col`}>
        <header className="flex items-center justify-between px-5 py-4 border-b border-stone-100">
          <h2 className="font-bold text-stone-800">{title}</h2>
          <button type="button" onClick={onClose} className="text-stone-400 hover:text-stone-700" aria-label="Close">
            ✕
          </button>
        </header>
        <div className="p-5 overflow-y-auto">{children}</div>
        {footer && <footer className="flex justify-end gap-2 px-5 py-4 border-t border-stone-100">{footer}</footer>}
      </div>
    </div>
  );
}

export function EmptyState({ title, children, action }) {
  return (
    <div className="text-center py-14 px-4">
      <p className="font-semibold text-stone-700">{title}</p>
      {children && <p className="text-sm text-stone-500 mt-1">{children}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function LoadingBlock() {
  return (
    <div className="flex items-center justify-center py-20 text-stone-400">
      <Spinner className="h-7 w-7" />
    </div>
  );
}

export function CharCount({ value, range }) {
  const n = (value || "").length;
  const [min, max] = range;
  const tone = !n ? "text-stone-400" : n < min || n > max + 10 ? "text-red-600" : n > max ? "text-amber-600" : "text-green-700";
  return (
    <span className={`text-xs font-semibold ${tone}`}>
      {n} / {max}
    </span>
  );
}
