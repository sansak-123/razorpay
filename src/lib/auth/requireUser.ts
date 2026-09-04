import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { User } from "@supabase/supabase-js";

// Shared by the /app layout and every dashboard page -- each checks
// independently rather than trusting the layout alone (the same "don't rely
// on a single gate" principle this Next version's own proxy docs call out
// for Route Handlers/Server Functions). Cheap: it's just reading the
// already-refreshed session cookie, not a network round-trip per call.
export async function requireUser(): Promise<User> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return user;
}
