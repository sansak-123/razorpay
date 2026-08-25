// Shared positioned tooltip for the D3 charts. The parent owns hover state
// (which mark is active, at what x/y) and just tells us where to render --
// this component only handles the floating-box mechanics, clamped so it
// never overflows its chart container.
export function ChartTooltip({
  x,
  y,
  visible,
  children,
}: {
  x: number | string;
  y: number | string;
  visible: boolean;
  children: React.ReactNode;
}) {
  if (!visible) return null;
  const top = typeof y === "number" ? y - 8 : `calc(${y} - 8px)`;
  return (
    <div
      className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-sm border border-ink-600 bg-ink-900 px-2.5 py-1.5 text-[12px] shadow-lg"
      style={{ left: x, top }}
      role="tooltip"
    >
      {children}
    </div>
  );
}
