const CATEGORIES = ["DUPLICATE", "REFUND", "ROUNDING", "UNEXPLAINED"];

export function CategoryMarquee() {
  const track = [...CATEGORIES, ...CATEGORIES, ...CATEGORIES, ...CATEGORIES];

  return (
    <section className="overflow-hidden border-y border-white/5 py-8 bg-navy-800/40">
      <div className="marquee-track flex whitespace-nowrap w-fit">
        {track.map((label, i) => (
          <span
            key={i}
            className="mx-6 text-[clamp(2rem,6vw,4rem)] font-bold uppercase tracking-tight select-none"
            style={{
              fontFamily: "var(--font-space-grotesk)",
              color: "transparent",
              WebkitTextStroke: i % CATEGORIES.length === 0 ? "1.5px var(--color-blue)" : "1.5px rgba(255,255,255,0.25)",
            }}
          >
            {label} ·
          </span>
        ))}
      </div>
    </section>
  );
}
