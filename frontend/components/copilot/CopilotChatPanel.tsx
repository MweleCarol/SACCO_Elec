"use client";

import { useState } from "react";
import { Sparkles, Send } from "lucide-react";
import { answerCopilotQuestion } from "@/services/copilot/answer";

interface Exchange { question: string; answer: string; isDeclined: boolean; }

interface CopilotChatPanelProps {
  suggestedQuestions: string[];
  greeting: string;
}

export function CopilotChatPanel({ suggestedQuestions, greeting }: CopilotChatPanelProps) {
  const [input, setInput] = useState("");
  const [history, setHistory] = useState<Exchange[]>([]);

  function ask(q: string) {
    if (!q.trim()) return;
    const { text, isDeclined } = answerCopilotQuestion(q);
    setHistory((prev) => [...prev, { question: q, answer: text, isDeclined }]);
    setInput("");
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    ask(input);
  }

  return (
    <div className="flex h-full flex-col rounded-2xl border border-[var(--sevs-border)] bg-white shadow-sm">
      <div className="flex items-center gap-2 border-b border-[var(--sevs-border)] p-4">
        <Sparkles className="h-4 w-4 text-[var(--sevs-navy)]" />
        <div>
          <p className="text-sm font-bold text-[var(--sevs-navy)]">Copilot Assistant</p>
          <p className="text-xs text-[var(--sevs-text-muted)]">Your AI governance and operations assistant</p>
        </div>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {history.length === 0 && <p className="text-sm text-[var(--sevs-text-body)]">{greeting}</p>}
        {history.map((h, i) => (
          <div key={i} className="text-sm">
            <p className="font-semibold text-[var(--sevs-navy)]">{h.question}</p>
            <p className={`mt-1 ${h.isDeclined ? "text-amber-700" : "text-[var(--sevs-text-body)]"}`}>{h.answer}</p>
          </div>
        ))}
      </div>

      <div className="border-t border-[var(--sevs-border)] p-4">
        <p className="mb-2 text-xs font-bold uppercase tracking-wide text-[var(--sevs-text-muted)]">Suggested Questions</p>
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
            placeholder="Ask me anything about your elections..."
            className="flex-1 rounded-lg border border-[var(--sevs-border)] px-3 py-2.5 text-sm focus:border-[var(--sevs-navy)] focus:outline-none"
          />
          <button type="submit" className="shrink-0 rounded-lg bg-[var(--sevs-navy)] px-4 py-2.5 text-white">
            <Send className="h-4 w-4" />
          </button>
        </form>
        <p className="mt-2 text-[10px] text-[var(--sevs-text-muted)]">
          AI responses are suggestions based on available data. You make the final decisions.
        </p>
      </div>
    </div>
  );
}