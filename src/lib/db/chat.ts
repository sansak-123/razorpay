import { createClient } from "@/lib/supabase/server";

export interface ChatMessageRow {
  id: string;
  role: "user" | "assistant";
  text: string;
  ai_answered: boolean | null;
  created_at: string;
}

export async function getChatHistory(userId: string): Promise<ChatMessageRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("chat_messages")
    .select("id, role, text, ai_answered, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return (data ?? []) as ChatMessageRow[];
}

export async function saveChatMessage(
  userId: string,
  role: "user" | "assistant",
  text: string,
  aiAnswered?: boolean
): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("chat_messages")
    .insert({ user_id: userId, role, text, ai_answered: aiAnswered ?? null });

  if (error) throw error;
}
