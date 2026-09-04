import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Where Google/Supabase redirects back to after consent. Exchanges the
// one-time code for a real session (this is a Route Handler, so it's
// allowed to set cookies -- see the setAll comment in
// src/lib/supabase/server.ts).
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}/app`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_failed`);
}
