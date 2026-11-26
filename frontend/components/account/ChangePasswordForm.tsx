"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useChangePassword } from "@/hooks/useProfile";
import {
  changePasswordSchema,
  PASSWORD_RULES_HINT,
  type ChangePasswordFormValues,
} from "@/lib/validation/auth";
import { getApiErrorMessage, getApiFieldErrors } from "@/services/api/errors";
import { PasswordField } from "@/components/ui/PasswordField";

// Changing the password ends every session (backend rule), so afterwards the
// user is sent to log in again with the new password.
export function ChangePasswordForm() {
  const change = useChangePassword();
  const [open, setOpen] = useState(false);
  const form = useForm<ChangePasswordFormValues>({
    resolver: zodResolver(changePasswordSchema),
  });

  async function submit(values: ChangePasswordFormValues) {
    try {
      await change.mutateAsync(values);
      // The server has already ended every session, including this one. A full
      // page load drops the in-memory token too and cannot race the sign-in
      // guard (which would send us to /login?next=… and lose the banner).
      window.location.replace("/login?passwordChanged=1");
    } catch (err) {
      for (const f of getApiFieldErrors(err)) {
        form.setError(f.field as keyof ChangePasswordFormValues, {
          message: f.message,
        });
      }
    }
  }

  return (
    <div className="rounded-xl border border-[var(--sevs-border)] p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-bold text-[var(--sevs-navy)]">Password</h3>
          <p className="text-sm text-[var(--sevs-text-muted)]">
            Changing it signs you out everywhere, including here.
          </p>
        </div>
        {!open && (
          <button
            onClick={() => setOpen(true)}
            className="rounded-lg border border-[var(--sevs-border)] px-4 py-2 text-sm font-bold text-[var(--sevs-navy)] hover:bg-gray-50"
          >
            Change password
          </button>
        )}
      </div>
      {open && (
        <form
          onSubmit={form.handleSubmit(submit)}
          noValidate
          className="mt-4 max-w-sm"
        >
          <PasswordField
            id="currentPassword"
            label="Current password"
            autoComplete="current-password"
            error={form.formState.errors.currentPassword?.message}
            {...form.register("currentPassword")}
          />
          <PasswordField
            id="newPassword"
            label="New password"
            autoComplete="new-password"
            hint={PASSWORD_RULES_HINT}
            error={form.formState.errors.newPassword?.message}
            {...form.register("newPassword")}
          />
          <PasswordField
            id="confirmNewPassword"
            label="New password again"
            autoComplete="new-password"
            error={form.formState.errors.confirmNewPassword?.message}
            {...form.register("confirmNewPassword")}
          />
          {change.isError && getApiFieldErrors(change.error).length === 0 && (
            <p
              role="alert"
              className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800"
            >
              {getApiErrorMessage(change.error)}
            </p>
          )}
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={form.formState.isSubmitting}
              className="rounded-lg bg-[var(--sevs-navy)] px-4 py-2 text-sm font-bold text-white hover:bg-[var(--sevs-navy-hover)] disabled:opacity-50"
            >
              {form.formState.isSubmitting ? "Saving…" : "Change password"}
            </button>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                form.reset();
              }}
              className="rounded-lg border border-[var(--sevs-border)] px-4 py-2 text-sm font-bold text-[var(--sevs-navy)] hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
