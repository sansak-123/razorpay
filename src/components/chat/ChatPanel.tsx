"use client";

import { useEffect, useRef, useState } from "react";
import type { Report } from "@/lib/types";

interface ChatMessage {
  role: "user" | "assistant";
  text: string;
  aiAnswered?: boolean;
}

// Global floating Q&A widget, mounted once in the dashboard shell so it's
// available from every page -- a merchant reading the Reconciliation Log
// can ask "why was this flagged?" right there instead of hunting for a
// separate "Ask" page. Self-contained: it only ever sends {question} to
// /api/chat and lets the server resolve the actual data (the signed-in
// user's own persisted latest run, via getOrCreateLatestRun) and persist
// the exchange, so no page has to plumb report/orders/settlementLines
// through props just for this.
export function ChatPanel() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const [chips, setChips] = useState<string[] | null>(null);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Load this user's persisted chat history once on mount, so it survives a
  // page reload instead of always starting empty.
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

  // Suggested prompts, built from the real current report so they're always
  // answerable -- fetched lazily on first open, not on every page load.
  useEffect(() => {
    if (!open || chips) return;
    fetch("/api/report")
      .then((r) => r.json())
      .then((report: Report) => {
        const built = [`What's my GST ITC position?`, `How much duplicate money did you catch?`];
        const topException = [...report.exceptions]
          .filter((e) => e.order_id)
          .sort((a, b) => b.amount - a.amount)[0];
        if (topException) {
          built.push(`Why was order ${topException.order_id} flagged?`);
        } else {
          built.push(`What's my overall match rate?`);
        }
        setChips(built);
      })
      .catch(() => setChips([`What's my GST ITC position?`, `How much duplicate money did you catch?`]));
  }, [open, chips]);

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
    <>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? "Close settlement Q&A" : "Ask about your settlements"}
        className="hover-glow fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-full border border-ink-700 bg-ink-800 px-4 py-3 text-[13px] font-mono text-text shadow-lg"
      >
        <IconChat />
        {!open && <span className="hidden sm:inline">Ask about your settlements</span>}
      </button>

      {open && (
        <div className="fixed bottom-20 right-5 z-50 flex h-[520px] w-[min(380px,calc(100vw-2.5rem))] flex-col overflow-hidden rounded-sm border border-ink-700 bg-ink-900 shadow-2xl">
          <div className="flex items-center justify-between border-b border-ink-700 bg-ink-800 px-4 py-3">
            <div>
              <div className="font-mono text-[10.5px] uppercase tracking-widest text-stamp">
                Settlement Q&amp;A
              </div>
              <div className="text-[11px] text-text-dim">Grounded in your actual report — nothing invented</div>
            </div>
            <button onClick={() => setOpen(false)} aria-label="Close" className="text-text-dim hover:text-text">
              ×
            </button>
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
            {historyLoaded && messages.length === 0 && (
              <div className="space-y-2">
                <p className="text-[12.5px] text-text-dim leading-relaxed">
                  Ask about a specific order, a category of exception, GST, or your overall match rate.
                </p>
                {(chips ?? []).map((c) => (
                  <button
                    key={c}
                    onClick={() => send(c)}
                    className="hover-glow block w-full rounded-sm border border-ink-700 px-3 py-2 text-left text-[12.5px] text-text-dim hover:text-text"
                  >
                    {c}
                  </button>
                ))}
              </div>
            )}

            {messages.map((m, i) => (
              <div key={i} className={m.role === "user" ? "text-right" : "text-left"}>
                <div
                  className={`inline-block max-w-[85%] rounded-sm px-3 py-2 text-[12.5px] leading-relaxed whitespace-pre-wrap text-left ${
                    m.role === "user"
                      ? "bg-stamp/15 border border-stamp/30 text-text"
                      : "bg-ink-800 border border-ink-700 text-text"
                  }`}
                >
                  {m.text}
                  {m.role === "assistant" && m.aiAnswered === false && (
                    <div className="mt-1.5 font-mono text-[10px] text-text-dim">
                      (raw data — AI reasoning unavailable)
                    </div>
                  )}
                </div>
              </div>
            ))}

            {pending && (
              <div className="text-left">
                <div className="inline-block rounded-sm border border-ink-700 bg-ink-800 px-3 py-2 text-[12.5px] text-text-dim">
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
            className="flex items-center gap-2 border-t border-ink-700 p-3"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask a question…"
              className="flex-1 rounded-sm border border-ink-700 bg-ink-800 px-3 py-2 text-[12.5px] text-text placeholder:text-text-dim/60 focus:outline-none focus:border-stamp-dim"
            />
            <button
              type="submit"
              disabled={pending || !input.trim()}
              className="hover-glow rounded-sm border border-stamp/40 bg-stamp/10 px-3 py-2 text-[12.5px] font-mono text-stamp disabled:opacity-40"
            >
              Send
            </button>
          </form>
        </div>
      )}
    </>
  );
}

function IconChat() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <rect x="1.5" y="2.5" width="13" height="8.5" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
      <path d="M5 11v2.5l3-2.5" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
    </svg>
  );
}
