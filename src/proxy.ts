import { createServerClient, type SetAllCookies } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Named `proxy.ts`, not `middleware.ts` -- this Next.js version deprecated
// and renamed the convention (confirmed in the bundled docs; every Supabase
// SSR guide online still says middleware.ts, which would silently not run
// at all here). Same job either name: keeps the Supabase session cookie
// fresh on every request so Server Components downstream see a valid
// session instead of one that quietly expired mid-visit.
//
// This refreshes the session; it does NOT gate access to /app -- that check
// lives in src/app/app/layout.tsx and, per this Next version's own proxy
// docs, in src/app/api/chat/route.ts too (a Route Handler is a separate
// request path proxy's matcher can miss on a refactor, so it re-checks auth
// itself rather than trusting proxy alone).
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  // Supabase isn't configured yet (no .env.local values set) -- rather than
  // crash on every request, pass through and let /app/layout.tsx's own
  // requireUser() surface a normal, page-scoped error for just that route.
  // The landing page, /login, and every other public route have no reason
  // to depend on Supabase being configured at all.
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return response;
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: Parameters<SetAllCookies>[0]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Touching auth.getUser() is what actually triggers the refresh -- a bare
  // getSession() would just read the (possibly stale) cookie without
  // renewing it.
  await supabase.auth.getUser();

  return response;
}

// Scoped to only the routes that actually need a live session: the
// protected dashboard and the chat API. The landing page, /login, and
// /auth/callback don't need proxy to run at all -- /login never has a
// session yet by definition, and /auth/callback creates one itself via
// exchangeCodeForSession. A broad "everything except static assets"
// matcher would run this (and fail without Supabase configured) on routes
// that have nothing to do with auth.
export const config = {
  matcher: ["/app/:path*", "/api/chat"],
};
