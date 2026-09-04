import { Sidebar } from "@/components/nav/Sidebar";
import { TopBar } from "@/components/nav/TopBar";
import { ChatPanel } from "@/components/chat/ChatPanel";
import { getEnvStatus } from "@/lib/envStatus";
import { requireUser } from "@/lib/auth/requireUser";

// The shared shell for all 5 dashboard routes, now living under the real
// /app segment (moved from the root "/" so a marketing landing page can
// occupy "/" instead -- see src/app/page.tsx). src/app/api/report/route.ts
// and src/app/api/chat/route.ts are siblings of this segment, unaffected by
// the move.
//
// Every route under /app requires a signed-in user -- checked here so a
// bare page visit redirects to /login, but src/app/api/chat/route.ts
// re-checks auth itself too, since a Route Handler is a separate request
// path this layout's redirect doesn't cover.
//
// force-dynamic on the whole segment: every page here now depends on the
// signed-in user's own session and their own persisted run, so there's
// nothing valid to statically prerender at build time. Without this, `next
// build` tries to prerender /app anyway and fails outright the moment
// Supabase isn't configured (the config-presence check in
// src/lib/supabase/server.ts throws before cookies() is ever called, so
// Next never gets the chance to detect the request-time API access and
// bail into dynamic rendering on its own).
export const dynamic = "force-dynamic";

export default async function DashboardLayout({ children }: LayoutProps<"/app">) {
  const user = await requireUser();
  const envStatus = getEnvStatus();

  return (
    <div className="flex min-h-full">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar envStatus={envStatus} userEmail={user.email ?? null} />
        <main className="flex-1 px-5 md:px-8 pt-20 md:pt-8 pb-24 max-w-5xl w-full mx-auto">
          {children}
        </main>
      </div>
      <ChatPanel />
    </div>
  );
}
