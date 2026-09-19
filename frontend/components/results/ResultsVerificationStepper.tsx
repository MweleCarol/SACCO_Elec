import { Check } from "lucide-react";

interface StepperStep {
  label: string;
  completed: boolean;
  detail?: string;
  timestamp?: string;
}

function formatStepTime(iso: string) {
  return new Date(iso).toLocaleString(undefined, { day: "2-digit", month: "short", hour: "numeric", minute: "2-digit" });
}

interface ResultsVerificationStepperProps {
  verifiedAt?: string;
  approvedCount: number;
  requiredCount: number;
  publishedAt: string;
  publishedBy?: string;
}

export function ResultsVerificationStepper({ verifiedAt, approvedCount, requiredCount, publishedAt, publishedBy }: ResultsVerificationStepperProps) {
  const datComplete = approvedCount >= requiredCount;

  const steps: StepperStep[] = [
    { label: "Counting Completed", completed: !!verifiedAt },
    { label: "Verified", completed: !!verifiedAt, timestamp: verifiedAt ? formatStepTime(verifiedAt) : undefined },
    { label: "DAT Approved", completed: datComplete, detail: `${approvedCount}/${requiredCount} Approvals` },
    { label: "Published", completed: true, detail: publishedBy ? `by ${publishedBy}` : undefined, timestamp: formatStepTime(publishedAt) },
  ];

  return (
    <div className="rounded-2xl border border-[var(--sevs-border)] bg-white p-5 shadow-sm sm:p-6">
      <h3 className="mb-5 text-sm font-bold uppercase tracking-wide text-[var(--sevs-text-muted)]">
        Results Verification &amp; Publication
      </h3>

      {/* Desktop/tablet: horizontal stepper */}
      <div className="hidden sm:flex sm:items-start">
        {steps.map((step, i) => (
          <div key={step.label} className="flex flex-1 items-start">
            <div className="flex min-w-0 flex-1 flex-col items-center text-center">
              <span
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                  step.completed ? "bg-emerald-500 text-white" : "bg-gray-100 text-gray-400"
                }`}
              >
                <Check className="h-4 w-4" />
              </span>
              <p className="mt-2 text-xs font-bold text-[var(--sevs-navy)]">{step.label}</p>
              {step.detail && <p className="text-[11px] text-[var(--sevs-text-muted)]">{step.detail}</p>}
              {step.timestamp && <p className="text-[11px] text-[var(--sevs-text-muted)]">{step.timestamp}</p>}
            </div>
            {i < steps.length - 1 && (
              <div className={`mt-4 h-0.5 flex-1 ${step.completed ? "bg-emerald-500" : "bg-gray-200"}`} />
            )}
          </div>
        ))}
      </div>

      {/* Mobile: vertical stepper */}
      <div className="space-y-4 sm:hidden">
        {steps.map((step, i) => (
          <div key={step.label} className="flex gap-3">
            <div className="flex flex-col items-center">
              <span
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
                  step.completed ? "bg-emerald-500 text-white" : "bg-gray-100 text-gray-400"
                }`}
              >
                <Check className="h-3.5 w-3.5" />
              </span>
              {i < steps.length - 1 && <div className={`mt-1 w-0.5 flex-1 ${step.completed ? "bg-emerald-500" : "bg-gray-200"}`} style={{ minHeight: 24 }} />}
            </div>
            <div className="pb-2">
              <p className="text-sm font-bold text-[var(--sevs-navy)]">{step.label}</p>
              {step.detail && <p className="text-xs text-[var(--sevs-text-muted)]">{step.detail}</p>}
              {step.timestamp && <p className="text-xs text-[var(--sevs-text-muted)]">{step.timestamp}</p>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}