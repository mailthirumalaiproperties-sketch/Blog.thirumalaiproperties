import Image from "next/image";

// Same wordmark treatment as the main website's Navbar.
export default function Logo({ variant = "light" }) {
  const onDark = variant === "dark";
  return (
    <span className="flex flex-col items-center justify-center select-none">
      <Image
        src={onDark ? "/images/logo-mark-footer.png" : "/images/logo-mark.png"}
        alt=""
        width={onDark ? 180 : 178}
        height={120}
        priority={!onDark}
        className={`h-8 md:h-10 w-auto object-contain ${onDark ? "brightness-0 invert" : ""}`}
      />
      <span className="flex flex-col items-center mt-1">
        <span
          className={`font-serif font-bold text-lg md:text-xl tracking-[0.12em] leading-none ${
            onDark
              ? "text-white"
              : "bg-gradient-to-b from-[#F5BC04] via-[#D29F13] to-[#9F7202] bg-clip-text text-transparent"
          }`}
        >
          THIRUMALAI
        </span>
        <span className="flex items-center gap-1.5 mt-0.5">
          <span className={`h-px w-3.5 ${onDark ? "bg-white/70" : "bg-brand-gold/80"}`} />
          <span
            className={`text-[9px] md:text-[10px] font-bold tracking-[0.25em] leading-none uppercase ${
              onDark ? "text-white/90" : "text-brand-gold"
            }`}
          >
            Blog
          </span>
          <span className={`h-px w-3.5 ${onDark ? "bg-white/70" : "bg-brand-gold/80"}`} />
        </span>
      </span>
    </span>
  );
}
