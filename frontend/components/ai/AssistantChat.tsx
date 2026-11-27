"use client";

import { useEffect, useId, useRef, useState, type FormEvent, type KeyboardEvent, type ReactNode } from "react";
import { ArrowUp, Check, Copy, RotateCcw, ShieldCheck, Sparkles } from "lucide-react";
import type { ChatTurn, CopilotAnswer } from "@/types/api";
import { getApiErrorMessage, getApiFieldErrors } from "@/services/api/errors";

interface Message {
  id: number;
  role: "user" | "assistant" | "error";
  text: string;
  at: Date;
  // For an error: the question to send again.
  retry?: string;
}

export interface AssistantChatProps {
  title: string;
  subtitle: string;
  greeting: string;
  suggestions: string[];
  // Short line under the header, e.g. "AI-generated · Advisory only".
  notice: string;
  ask: (question: string, history: ChatTurn[]) => Promise<CopilotAnswer>;
  // Extra controls in the header (e.g. a close button in the member dialog).
  headerActions?: ReactNode;
  // Called with the textarea so a dialog can focus it when it opens.
  inputRef?: (el: HTMLTextAreaElement | null) => void;
}

const MAX_LENGTH = 1000;
const HISTORY_TURNS = 6;

const time = (d: Date) => d.toLocaleTimeString("en-KE", { hour: "numeric", minute: "2-digit" });

// The chat used by both the staff Copilot and the members' help assistant.
// New messages are announced to screen readers (role="log"); Enter sends,
// Shift+Enter adds a line; the last few turns go back to the server so
// follow-up questions make sense.
export function AssistantChat({ title, subtitle, greeting, suggestions, notice, ask, headerActions, inputRef }: AssistantChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState(false);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const nextId = useRef(1);
  const logRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const ids = { title: useId(), input: useId(), hint: useId(), count: useId() };

  // Keep the newest message in view.
  useEffect(() => {
    const el = logRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, pending]);

  // Grow the box with its text, up to about five lines.
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 136)}px`;
  }, [draft]);

  function historyFor(list: Message[]): ChatTurn[] {
    return list
      .filter((m): m is Message & { role: "user" | "assistant" } => m.role !== "error")
      .slice(-HISTORY_TURNS)
      .map((m) => ({ role: m.role, text: m.text.slice(0, 2000) }));
  }

  async function send(question: string) {
    const q = question.trim();
    if (q.length < 3 || pending) return;
    // Drop a failed attempt at the same question before retrying it.
    const base = messages.filter((m) => !(m.role === "error" && m.retry === q));
    const history = historyFor(base);
    const userMsg: Message = { id: nextId.current++, role: "user", text: q, at: new Date() };
    setMessages([...base, userMsg]);
    setDraft("");
    setPending(true);
    try {
      const res = await ask(q, history);
      setMessages((m) => [...m, { id: nextId.current++, role: "assistant", text: res.answer, at: new Date() }]);
    } catch (err) {
      const text = getApiFieldErrors(err)[0]?.message ?? getApiErrorMessage(err, "Something went wrong. Please try again.");
      setMessages((m) => [...m, { id: nextId.current++, role: "error", text, at: new Date(), retry: q }]);
    } finally {
      setPending(false);
      textareaRef.current?.focus();
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    void send(draft);
  }

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      void send(draft);
    }
  }

  async function copy(m: Message) {
    try {
      await navigator.clipboard.writeText(m.text);
      setCopiedId(m.id);
      setTimeout(() => setCopiedId((c) => (c === m.id ? null : c)), 2000);
    } catch {
      // clipboard unavailable: nothing to do
    }
  }

  function reset() {
    setMessages([]);
    setDraft("");
    textareaRef.current?.focus();
  }

  const tooShort = draft.trim().length < 3;
  const nearLimit = draft.length > MAX_LENGTH - 200;

  return (
    <section aria-labelledby={ids.title} className="flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-[var(--sevs-border)] bg-white shadow-sm">
      {/* Header */}
      <header className="flex items-center gap-3 border-b border-[var(--sevs-border)] px-4 py-3 sm:px-5">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--sevs-navy)]">
          <Sparkles className="h-5 w-5 text-white" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 id={ids.title} className="truncate text-base font-bold text-[var(--sevs-navy)]">{title}</h2>
          <p className="truncate text-xs text-[var(--sevs-text-muted)]">{subtitle}</p>
        </div>
        {messages.length > 0 && (
          <button
            type="button"
            onClick={reset}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg px-2.5 text-xs font-bold text-[var(--sevs-navy)] hover:bg-[var(--sevs-bg)]"
          >
            <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
            New chat
          </button>
        )}
        {headerActions}
      </header>
      <p className="flex items-center gap-1.5 border-b border-[var(--sevs-border)] bg-[var(--sevs-bg)] px-4 py-1.5 text-[11px] font-medium text-[var(--sevs-text-muted)] sm:px-5">
        <ShieldCheck className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        {notice}
      </p>

      {/* Conversation */}
      <div
        ref={logRef}
        role="log"
        aria-label="Conversation"
        aria-live="polite"
        aria-busy={pending}
        tabIndex={0}
        className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-5 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--sevs-navy)]/30 sm:px-5"
      >
        {messages.length === 0 && (
          <div className="flex flex-col items-center px-2 pt-2 text-center">
            <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--sevs-navy)]/10">
              <Sparkles className="h-6 w-6 text-[var(--sevs-navy)]" aria-hidden="true" />
            </span>
            <p className="max-w-sm text-sm text-[var(--sevs-text-body)]">{greeting}</p>
            <p className="mb-2 mt-5 text-[11px] font-bold uppercase tracking-wider text-[var(--sevs-text-muted)]">Try asking</p>
            <ul className="grid w-full gap-2 sm:grid-cols-2">
              {suggestions.map((s) => (
                <li key={s}>
                  <button
                    type="button"
                    onClick={() => void send(s)}
                    className="h-full w-full rounded-xl border border-[var(--sevs-border)] px-3 py-2.5 text-left text-sm text-[var(--sevs-navy)] transition-colors hover:border-[var(--sevs-navy)]/40 hover:bg-[var(--sevs-bg)]"
                  >
                    {s}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {messages.map((m) =>
          m.role === "user" ? (
            <div key={m.id} className="flex justify-end">
              <div className="max-w-[85%]">
                <p className="sr-only">You said:</p>
                <p className="whitespace-pre-wrap break-words rounded-2xl rounded-tr-md bg-[var(--sevs-navy)] px-4 py-2.5 text-sm text-white">
                  {m.text}
                </p>
                <p className="mt-1 text-right text-[11px] text-[var(--sevs-text-muted)]">{time(m.at)}</p>
              </div>
            </div>
          ) : m.role === "assistant" ? (
            <div key={m.id} className="flex gap-2.5">
              <span aria-hidden="true" className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[var(--sevs-navy)]/10">
                <Sparkles className="h-3.5 w-3.5 text-[var(--sevs-navy)]" />
              </span>
              <div className="min-w-0 max-w-[85%]">
                <p className="sr-only">{title} replied:</p>
                <p className="whitespace-pre-wrap break-words rounded-2xl rounded-tl-md bg-[var(--sevs-bg)] px-4 py-2.5 text-sm leading-relaxed text-[var(--sevs-text-body)]">
                  {m.text}
                </p>
                <div className="mt-1 flex items-center gap-3 text-[11px] text-[var(--sevs-text-muted)]">
                  <span>{time(m.at)}</span>
                  <span aria-hidden="true">·</span>
                  <span>AI-generated</span>
                  <button
                    type="button"
                    onClick={() => void copy(m)}
                    className="inline-flex items-center gap-1 rounded px-1 font-bold text-[var(--sevs-navy)] hover:underline"
                  >
                    {copiedId === m.id ? <Check className="h-3 w-3" aria-hidden="true" /> : <Copy className="h-3 w-3" aria-hidden="true" />}
                    {copiedId === m.id ? "Copied" : "Copy"}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div key={m.id} className="flex gap-2.5">
              <span aria-hidden="true" className="w-7 shrink-0" />
              <div role="alert" className="max-w-[85%] rounded-2xl rounded-tl-md border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-800">
                <p>{m.text}</p>
                {m.retry && (
                  <button type="button" onClick={() => void send(m.retry!)} className="mt-1.5 text-sm font-bold underline">
                    Try again
                  </button>
                )}
              </div>
            </div>
          )
        )}

        {pending && (
          <div className="flex gap-2.5">
            <span aria-hidden="true" className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[var(--sevs-navy)]/10">
              <Sparkles className="h-3.5 w-3.5 text-[var(--sevs-navy)]" />
            </span>
            <div className="flex items-center gap-1 rounded-2xl rounded-tl-md bg-[var(--sevs-bg)] px-4 py-3.5">
              <span className="sr-only">{title} is writing a reply…</span>
              {[0, 150, 300].map((delay) => (
                <span
                  key={delay}
                  aria-hidden="true"
                  style={{ animationDelay: `${delay}ms` }}
                  className="h-1.5 w-1.5 animate-bounce rounded-full bg-[var(--sevs-text-muted)] motion-reduce:animate-none"
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Composer */}
      <form onSubmit={onSubmit} className="border-t border-[var(--sevs-border)] p-3 sm:p-4">
        <label htmlFor={ids.input} className="sr-only">
          Message to {title}
        </label>
        <div className="flex items-end gap-2 rounded-xl border border-[var(--sevs-border)] bg-white px-3 py-2 focus-within:border-[var(--sevs-navy)] focus-within:ring-2 focus-within:ring-[var(--sevs-navy)]/15">
          <textarea
            id={ids.input}
            ref={(el) => {
              textareaRef.current = el;
              inputRef?.(el);
            }}
            rows={1}
            value={draft}
            maxLength={MAX_LENGTH}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Type your question…"
            aria-describedby={`${ids.hint}${nearLimit ? ` ${ids.count}` : ""}`}
            className="max-h-[136px] min-h-[24px] flex-1 resize-none bg-transparent py-1 text-sm text-[var(--sevs-text-body)] placeholder:text-[var(--sevs-text-muted)] focus:outline-none"
          />
          <button
            type="submit"
            disabled={pending || tooShort}
            aria-label="Send"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--sevs-navy)] text-white transition-opacity hover:bg-[var(--sevs-navy-hover)] disabled:opacity-40"
          >
            <ArrowUp className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
        <div className="mt-1.5 flex justify-between gap-2 text-[11px] text-[var(--sevs-text-muted)]">
          <span id={ids.hint}>
            <span className="hidden sm:inline">Enter to send, Shift + Enter for a new line. </span>Answers can be wrong; check important details.
          </span>
          {nearLimit && (
            <span id={ids.count} className="shrink-0">
              {draft.length}/{MAX_LENGTH}
            </span>
          )}
        </div>
      </form>
    </section>
  );
}