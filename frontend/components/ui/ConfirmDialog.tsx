"use client";

interface ConfirmDialogProps {
  title: string;
  message: string;
  confirmLabel: string;
  tone?: "danger" | "default";
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({ title, message, confirmLabel, tone = "default", onConfirm, onCancel }: ConfirmDialogProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-black/40" onClick={onCancel} />
      <div className="relative w-full max-w-sm rounded-t-3xl bg-white p-6 shadow-xl sm:rounded-2xl">
        <h3 className="text-lg font-bold text-[var(--sevs-navy)]">{title}</h3>
        <p className="mt-2 text-sm text-[var(--sevs-text-muted)]">{message}</p>
        <div className="mt-6 flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 rounded-lg border border-[var(--sevs-border)] py-2.5 text-sm font-bold text-[var(--sevs-text-body)]"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 rounded-lg py-2.5 text-sm font-bold text-white ${
              tone === "danger" ? "bg-red-600 hover:bg-red-700" : "bg-[var(--sevs-navy)] hover:bg-[var(--sevs-navy-hover)]"
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}