export default function DashboardLoading() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center text-center px-6">
      <div className="stamp-in flex items-center gap-1.5 mb-6">
        <span className="h-2 w-2 rounded-full bg-stamp animate-bounce [animation-delay:-0.2s]" />
        <span className="h-2 w-2 rounded-full bg-stamp animate-bounce" />
        <span className="h-2 w-2 rounded-full bg-stamp animate-bounce [animation-delay:0.2s]" />
      </div>
      <h1 className="font-display text-2xl text-text mb-2">Setting up your workspace</h1>
      <p className="text-text-dim text-[16px] max-w-xs leading-relaxed">
        Running reconciliation on your settlement data — order matching,
        exception detection, and AI-reasoned judgment where the rules
        genuinely aren&apos;t sure.
      </p>
    </div>
  );
}
