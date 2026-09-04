const CATEGORIES = ["DUPLICATE", "REFUND", "ROUNDING", "UNEXPLAINED"];

// Kinetic-typography marquee: your actual exception taxonomy, not decorative
// filler text -- telegraphs "this tool understands the shape of settlement
// problems" as a moving header. Pure CSS (marqueeScroll keyframe in
// globals.css): content is duplicated once below so translating by exactly
// -50% loops seamlessly, no JS/library needed. Outline-only text via
// -webkit-text-stroke so it reads against the navy background through the
// stroke alone.
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
