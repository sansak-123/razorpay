import Link from "next/link";

export function LandingFooter() {
  return (
    <footer id="try-it" className="px-6 md:px-10 py-20 md:py-28 text-center border-t border-white/5">
      <h2
        className="text-landing-white font-medium mb-8"
        style={{ fontFamily: "var(--font-space-grotesk)", fontSize: "clamp(2rem, 6vw, 3.5rem)" }}
      >
        See your money, unpacked.
      </h2>

      <div className="flex items-center justify-center gap-4 mb-14">
        <Link
          href="/app"
          className="group flex items-center gap-2 rounded-full bg-blue px-7 py-3.5 text-[16.5px] font-semibold text-navy-900 transition-all hover:shadow-[0_0_0_1px_var(--color-blue),0_8px_28px_-8px_var(--color-blue)]"
        >
          Sign up / Sign in
          <span className="transition-transform group-hover:translate-x-1">→</span>
        </Link>
        <a
          href="https://github.com"
          target="_blank"
          rel="noreferrer"
          className="rounded-full border border-white/15 px-5 py-3.5 text-[16.5px] font-medium text-landing-white transition-colors hover:border-blue hover:text-blue"
          aria-label="View source on GitHub"
        >
          GitHub ↗
        </a>
      </div>
    </footer>
  );
}
