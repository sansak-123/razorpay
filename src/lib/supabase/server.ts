import { createServerClient, type SetAllCookies } from "@supabase/ssr";
import { cookies } from "next/headers";

// For Server Components, Route Handlers, and Server Functions. `cookies()`
// is async in this Next.js version (confirmed in the bundled docs -- see
// node_modules/next/dist/docs/.../functions/cookies.md), so this helper is
// async too. The setAll try/catch matters: Next.js only allows mutating
// cookies from a Server Function or Route Handler, not a Server Component
// render -- calling this from a plain page is fine for *reading* the
// session, and proxy.ts is what actually keeps the session cookie fresh, so
// a swallowed setAll error here is expected/harmless in that case.
export async function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error(
      "Supabase isn't configured yet -- set NEXT_PUBLIC_SUPABASE_URL and " +
        "NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local (see supabase/schema.sql " +
        "and the external-setup steps in the implementation plan)."
    );
  }

  const cookieStore = await cookies();

  return createServerClient(url, anonKey, {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: Parameters<SetAllCookies>[0]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Called from a Server Component -- proxy.ts refreshes the
            // session cookie instead, so this is safe to ignore here.
          }
        },
      },
    }
  );
}
