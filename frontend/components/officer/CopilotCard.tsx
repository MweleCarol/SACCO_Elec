"use client";

import { useState } from "react";
import { Sparkles, Send } from "lucide-react";
import { answerCopilotQuestion } from "@/services/copilot/answer";

interface Exchange {
  question: string;
  answer: string;
  isDeclined: boolean;
}

export function CopilotCard() {
  const [input, setInput] = useState("");
  const [history, setHistory] = useState<Exchange[]>([]);

  function handleAsk(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim()) return;
    const { text, isDeclined } = answerCopilotQuestion(input);
    setHistory((prev) => [...prev, { question: input, answer: text, isDeclined }]);
    setInput("");
  }

  return (
    <div className="rounded-2xl border border-[var(--sevs-border)] bg-white p-5 shadow-sm sm:p-6">
      <div className="mb-3 flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-[var(--sevs-navy)]" />
        <h3 className="text-sm font-bold uppercase tracking-wide text-[var(--sevs-text-muted)]">SEVS Election Copilot</h3>
      </div>

      {history.length > 0 && (
        <div className="mb-3 max-h-60 space-y-3 overflow-y-auto">
          {history.map((h, i) => (
            <div key={i} className="text-sm">
              <p className="font-semibold text-[var(--sevs-navy)]">{h.question}</p>
              <p className={`mt-1 ${h.isDeclined ? "text-amber-700" : "text-[var(--sevs-text-body)]"}`}>{h.answer}</p>
            </div>
          ))}
        </div>
      )}

      <form onSubmit={handleAsk} className="flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about elections, candidates, approvals, or activity..."
          className="flex-1 rounded-lg border border-[var(--sevs-border)] px-3 py-2.5 text-sm focus:border-[var(--sevs-navy)] focus:outline-none"
        />
        <button type="submit" className="shrink-0 rounded-lg bg-[var(--sevs-navy)] px-4 py-2.5 text-white">
          <Send className="h-4 w-4" />
        </button>
      </form>
      <p className="mt-2 text-xs text-[var(--sevs-text-muted)]">
        The Copilot answers questions from election and administrative data only. It cannot access ballot contents and cannot approve, reject, or change anything.
      </p>
    </div>
  );
}