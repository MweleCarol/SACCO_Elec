"use client";

import { useState } from "react";
import { Sparkles, Send, Shield, X } from "lucide-react";
import { answerCopilotQuestion } from "@/services/copilot/answer";

interface Exchange {
  question: string;
  answer: string;
  isDeclined: boolean;
  askedAt: string;
}

interface CopilotChatPanelProps {
  suggestedQuestions: string[];
  greeting: string;
  title?: string;
  subtitle?: string;
  online?: boolean;
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

export function CopilotChatPanel({
  suggestedQuestions,
  greeting,
  title = "AI Copilot",
  subtitle = "Your AI governance and operations assistant",
  online = true,
}: CopilotChatPanelProps) {
  const [input, setInput] = useState("");
  const [history, setHistory] = useState<Exchange[]>([]);

  const [copilotOpen, setCopilotOpen] = useState(false);

  function ask(q: string) {
    if (!q.trim()) return;
    const { text, isDeclined } = answerCopilotQuestion(q);
    setHistory((prev) => [...prev, { question: q, answer: text, isDeclined, askedAt: new Date().toISOString() }]);
    setInput("");
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    ask(input);
  }

  return (
    <div className="flex h-full flex-col rounded-2xl border border-[var(--sevs-border)] bg-white shadow-sm">
      <div className="flex items-center justify-between gap-2 border-b border-[var(--sevs-border)] p-4">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--sevs-navy)] text-white">
            <Sparkles className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-[var(--sevs-navy)]">{title}</p>
            <p className="truncate text-xs text-[var(--sevs-text-muted)]">{subtitle}</p>
          </div>
        </div>
        {online && (
          <span className="flex shrink-0 items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Online
          </span>
        )}
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        {history.length === 0 && <p className="text-sm text-[var(--sevs-text-body)]">{greeting}</p>}

        {history.map((h, i) => (
          <div key={i} className="space-y-1.5">
            <div className="flex flex-col items-end">
              <div className="max-w-[85%] rounded-2xl rounded-br-md bg-[var(--sevs-navy)]/10 px-3 py-2 text-sm text-[var(--sevs-navy)]">
                {h.question}
              </div>
              <p className="mt-1 text-[10px] text-[var(--sevs-text-muted)]">{formatTime(h.askedAt)}</p>
            </div>

            <div className="flex flex-col items-start">
              <p className={`max-w-[90%] text-sm ${h.isDeclined ? "text-amber-700" : "text-[var(--sevs-text-body)]"}`}>
                {h.answer}
              </p>
              <p className="mt-1 text-[10px] text-[var(--sevs-text-muted)]">{formatTime(h.askedAt)}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="border-t border-[var(--sevs-border)] p-4">
        <p className="mb-2 text-xs font-bold uppercase tracking-wide text-[var(--sevs-text-muted)]">Quick Questions</p>
        <div className="mb-3 flex flex-wrap gap-2">
          {suggestedQuestions.map((q) => (
            <button
              key={q}
              onClick={() => ask(q)}
              className="rounded-full border border-[var(--sevs-border)] px-3 py-1.5 text-xs font-medium text-[var(--sevs-navy)] hover:bg-[var(--sevs-bg)]"
            >
              {q}
            </button>
          ))}
        </div>
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your question here..."
            className="flex-1 rounded-lg border border-[var(--sevs-border)] px-3 py-2.5 text-sm focus:border-[var(--sevs-navy)] focus:outline-none"
          />
          <button type="submit" className="shrink-0 rounded-lg bg-[var(--sevs-navy)] px-4 py-2.5 text-white">
            <Send className="h-4 w-4" />
          </button>
        </form>
        <p className="mt-2 flex items-center gap-1 text-[10px] text-[var(--sevs-text-muted)]">
          <Shield className="h-3 w-3 shrink-0" />
          AI provides insights and recommendations. Humans make the decisions.
        </p>
      </div>
    </div>
  );
}