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
      className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-sm border border-ink-600 bg-ink-900 px-2.5 py-1.5 text-[13.5px] shadow-lg"
      style={{ left: x, top }}
      role="tooltip"
    >
      {children}
    </div>
  );
}
