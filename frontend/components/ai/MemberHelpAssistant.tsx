"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { MessageCircleQuestion, X } from "lucide-react";
import { askAssistant } from "@/services/ai.service";
import { AssistantChat } from "@/components/ai/AssistantChat";

const SUGGESTIONS = [
  "How do I vote?",
  "When does voting close?",
  "How do I apply to be a candidate?",
  "When will the results be out?",
];

// The members' help assistant: a button in the bottom corner that opens a
// chat panel. The conversation is kept while the member moves between pages.
// Hidden on the ballot so nothing competes with voting.
export function MemberHelpAssistant() {
  const pathname = usePathname() ?? "";
  const [open, setOpen] = useState(false);
  const launcherRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const onBallot = pathname.startsWith("/vote/");

  function close() {
    setOpen(false);
    // Back to the button that opened it.
    requestAnimationFrame(() => launcherRef.current?.focus());
  }

  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        close();
        return;
      }
      // Keep Tab inside the panel while it is open.
      if (e.key === "Tab" && panelRef.current) {
        const items = Array.from(
          panelRef.current.querySelectorAll<HTMLElement>('button:not([disabled]), textarea, [tabindex="0"]')
        );
        const first = items[0];
        const last = items[items.length - 1];
        if (!first || !last) return;
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  if (onBallot) return null;

  return (
    <>
      {!open && (
        <button
          ref={launcherRef}
          type="button"
          onClick={() => setOpen(true)}
          aria-haspopup="dialog"
          className="fixed bottom-[calc(6rem+env(safe-area-inset-bottom))] right-4 z-30 inline-flex h-12 items-center gap-2 rounded-full bg-[var(--sevs-navy)] px-4 text-sm font-bold text-white shadow-lg shadow-black/15 transition-colors hover:bg-[var(--sevs-navy-hover)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--sevs-navy)]/30 md:bottom-6 md:right-6"
        >
          <MessageCircleQuestion className="h-5 w-5" aria-hidden="true" />
          <span className="hidden sm:inline">Need help?</span>
          <span className="sr-only sm:hidden">Open the SEVS help assistant</span>
        </button>
      )}

      {/* Kept mounted while closed (just hidden) so the conversation survives. */}
      <div className={open ? "fixed inset-0 z-50 flex items-end justify-end sm:p-6" : "hidden"}>
        <div className="absolute inset-0 bg-black/30 sm:bg-black/10" onClick={close} aria-hidden="true" />
        <div
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-label="SEVS Help Assistant"
          className="relative flex h-[100dvh] w-full flex-col sm:h-[min(640px,calc(100dvh-3rem))] sm:w-[420px]"
        >
          <AssistantChat
            title="SEVS Help"
            subtitle="Voting, candidates and results"
            greeting="Hi! I can explain how to vote, apply as a candidate, find results, or who to contact. I can't see votes and I don't recommend candidates."
            suggestions={SUGGESTIONS}
            notice="AI-generated · Uses public election information only · Neutral"
            ask={askAssistant}
            inputRef={(el) => {
              inputRef.current = el;
            }}
            headerActions={
              <button
                type="button"
                onClick={close}
                aria-label="Close help"
                className="flex h-9 w-9 items-center justify-center rounded-lg text-[var(--sevs-text-muted)] hover:bg-[var(--sevs-bg)]"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            }
          />
        </div>
      </div>
    </>
  );
}