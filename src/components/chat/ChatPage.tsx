"use client";

import { useEffect, useRef, useState } from "react";
import type { Report } from "@/lib/types";

interface ChatMessage {
  role: "user" | "assistant";
  text: string;
  aiAnswered?: boolean;
}

export function ChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const [chips, setChips] = useState<string[] | null>(null);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/chat")
      .then((r) => (r.ok ? r.json() : { history: [] }))
      .then((data: { history?: { role: "user" | "assistant"; text: string; ai_answered: boolean | null }[] }) => {
        setMessages(
          (data.history ?? []).map((m) => ({
            role: m.role,
            text: m.text,
            aiAnswered: m.ai_answered ?? undefined,
          }))
        );
      })
      .catch(() => {})
      .finally(() => setHistoryLoaded(true));
  }, []);

  useEffect(() => {
    fetch("/api/report")
      .then((r) => r.json())
      .then((report: Report) => {
        const built = [
          `What's my GST ITC position?`,
          `How much duplicate money did you catch?`,
          `What still needs my review?`,
        ];
        const topException = [...report.exceptions]
          .filter((e) => e.order_id)
          .sort((a, b) => b.amount - a.amount)[0];
        if (topException) built.push(`Why was order ${topException.order_id} flagged?`);
        setChips(built);
      })
      .catch(() => setChips([`What's my GST ITC position?`, `How much duplicate money did you catch?`]));
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, pending]);

  async function send(question: string) {
    const text = question.trim();
    if (!text || pending) return;
    setMessages((m) => [...m, { role: "user", text }]);
    setInput("");
    setPending(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: text }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Chat request failed");
      setMessages((m) => [...m, { role: "assistant", text: data.answer, aiAnswered: data.aiAnswered }]);
    } catch (err) {
      setMessages((m) => [
        ...m,
        { role: "assistant", text: err instanceof Error ? err.message : "Something went wrong." },
      ]);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="fade-in-up flex flex-col h-[calc(100vh-11rem)] md:h-[calc(100vh-9rem)]">
      <header className="mb-6">
        <div className="font-mono text-[12.5px] tracking-widest text-stamp uppercase mb-3">
          Ask AI
        </div>
        <h1 className="font-display text-4xl font-normal tracking-tight mb-3 text-text">
          Ask your ledger anything
        </h1>
        <p className="text-text-dim text-[17px] max-w-lg leading-relaxed">
          Grounded in your actual reconciliation report — every answer cites
          real records, and it says so plainly when it doesn&apos;t have data
          on something.
        </p>
      </header>

      <div className="flex-1 flex flex-col min-h-0 rounded-sm border border-ink-700 bg-ink-800 overflow-hidden">
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-5 space-y-4">
          {historyLoaded && messages.length === 0 && (
            <div className="max-w-md">
              <p className="text-[15.5px] text-text-dim leading-relaxed mb-3">
                Ask about a specific order, a category of exception, GST, or your overall match rate.
              </p>
              <div className="flex flex-col gap-2">
                {(chips ?? []).map((c) => (
                  <button
                    key={c}
                    onClick={() => send(c)}
                    className="hover-glow rounded-sm border border-ink-700 px-3.5 py-2.5 text-left text-[14.5px] text-text-dim hover:text-text"
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((m, i) => (
            <div key={i} className={m.role === "user" ? "text-right" : "text-left"}>
              <div
                className={`inline-block max-w-[75%] rounded-sm px-4 py-2.5 text-[15.5px] leading-relaxed whitespace-pre-wrap text-left ${
                  m.role === "user"
                    ? "bg-stamp/15 border border-stamp/30 text-text"
                    : "bg-ink-900 border border-ink-700 text-text"
                }`}
              >
                {m.text}
                {m.role === "assistant" && m.aiAnswered === false && (
                  <div className="mt-1.5 font-mono text-[11.5px] text-text-dim">
                    (raw data — AI reasoning unavailable)
                  </div>
                )}
              </div>
            </div>
          ))}

          {pending && (
            <div className="text-left">
              <div className="inline-block rounded-sm border border-ink-700 bg-ink-900 px-4 py-2.5 text-[15.5px] text-text-dim">
                Thinking…
              </div>
            </div>
          )}
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
          className="flex items-center gap-3 border-t border-ink-700 p-4"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask a question about your settlements…"
            className="flex-1 rounded-sm border border-ink-700 bg-ink-900 px-4 py-3 text-[15.5px] text-text placeholder:text-text-dim/60 focus:outline-none focus:border-stamp-dim"
          />
          <button
            type="submit"
            disabled={pending || !input.trim()}
            className="hover-glow rounded-sm border border-stamp bg-stamp/10 px-5 py-3 text-[15.5px] font-semibold text-stamp disabled:opacity-40"
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
}
