import Link from "next/link";

export function Hero() {
  return (
    <section className="relative px-6 md:px-10 pt-16 md:pt-24 pb-20 md:pb-28 max-w-5xl mx-auto text-center">
      <h1
        className="leading-[0.98] tracking-tight text-landing-white"
        style={{ fontFamily: "var(--font-space-grotesk)" }}
      >
        <span
          className="block font-medium fade-in-up"
          style={{ fontSize: "clamp(2.5rem, 7vw, 5.5rem)" }}
        >
          One lump sum.
        </span>
        <span
          className="relative inline-block font-medium text-landing-text-dim/70 fade-in-up my-1 md:my-2"
          style={{
            fontSize: "clamp(1.75rem, 5vw, 3.5rem)",
            textDecorationLine: "line-through",
            textDecorationColor: "var(--color-blue-dim)",
            textDecorationThickness: "3px",
            transform: "rotate(-1.5deg)",
            ["--fade-delay" as string]: "120ms",
          }}
        >
          &quot;Where did my money go?&quot;
        </span>
        <span
          className="block font-bold text-blue fade-in-up"
          style={{ fontSize: "clamp(2.75rem, 8vw, 6rem)", ["--fade-delay" as string]: "260ms" }}
        >
          Fully unpacked.
        </span>
      </h1>

      <p
        className="fade-in-up mt-7 max-w-xl mx-auto text-[18px] md:text-[19px] text-landing-text-dim leading-relaxed"
        style={{ ["--fade-delay" as string]: "380ms" }}
      >
        One lumped bank credit, hundreds of orders, zero breakdown of what got
        deducted. Unsettle explodes it back open — order by order, deduction
        by deduction — and tells you exactly how much of it you can still get
        back. Starts with Razorpay&apos;s settlement data; built to go
        wherever your money actually moves.
      </p>

      <div className="fade-in-up mt-9 flex items-center justify-center gap-4" style={{ ["--fade-delay" as string]: "460ms" }}>
        <Link
          href="/app"
          className="group flex items-center gap-2 rounded-full bg-blue px-6 py-3.5 text-[16.5px] font-semibold text-navy-900 transition-all hover:shadow-[0_0_0_1px_var(--color-blue),0_8px_28px_-8px_var(--color-blue)]"
        >
          Sign up / Sign in
          <span className="transition-transform group-hover:translate-x-1">→</span>
        </Link>
        <a
          href="#how-it-works"
          className="rounded-full border border-white/15 px-6 py-3.5 text-[16.5px] font-medium text-landing-white transition-colors hover:border-blue hover:text-blue"
        >
          How it works
        </a>
      </div>
    </section>
  );
}
