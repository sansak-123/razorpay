import { createBrowserClient } from "@supabase/ssr";

// For Client Components only (the login button, sign-out button). Uses the
// anon/public key -- safe to ship to the browser, since every table's Row
// Level Security policy keys off auth.uid(), not this key's privilege
// level. There is no service_role key anywhere in this app on purpose.
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
