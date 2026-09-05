import type { Metadata } from "next";
import { ChatPage } from "@/components/chat/ChatPage";

export const metadata: Metadata = { title: "Ask AI · Unsettle" };

export default function AskAIPage() {
  return <ChatPage />;
}
