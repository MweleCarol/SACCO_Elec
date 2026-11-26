"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  backupCodeSchema,
  loginSchema,
  mfaCodeSchema,
  type BackupCodeFormValues,
  type LoginFormValues,
  type MfaCodeFormValues,
} from "@/lib/validation/auth";
import { useAuth } from "@/contexts/AuthContext";
import { isMfaChallenge } from "@/types/api";
import { getApiErrorMessage, getApiStatus } from "@/services/api/errors";
import { AuthShell } from "@/components/auth/AuthShell";
import { FormField } from "@/components/ui/FormField";
import { PasswordField } from "@/components/ui/PasswordField";
import { Button } from "@/components/ui/button";

// Only follow ?next= to pages inside this app (never to another website).
function safeNext(next: string | null): string {
  return next && next.startsWith("/") && !next.startsWith("//")
    ? next
    : "/dashboard";
}

function ErrorBox({ message }: { message: string }) {
  return (
    <p
      role="alert"
      className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700"
    >
      {message}
    </p>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, verifyMfa } = useAuth();
  const destination = safeNext(searchParams.get("next"));
  const justRegistered = searchParams.get("registered") === "1";
  const passwordChanged = searchParams.get("passwordChanged") === "1";
  const [serverError, setServerError] = useState<string | null>(null);
  // Set when the password was right but the account also needs an MFA code.
  const [mfaChallengeToken, setMfaChallengeToken] = useState<string | null>(
    null,
  );

  const credentials = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  });
  const mfa = useForm<MfaCodeFormValues>({
    resolver: zodResolver(mfaCodeSchema),
  });
  const backup = useForm<BackupCodeFormValues>({
    resolver: zodResolver(backupCodeSchema),
  });
  // Lost phone: sign in with a one-time backup code instead of the app code.
  const [useBackup, setUseBackup] = useState(false);

  async function onSubmitCredentials(values: LoginFormValues) {
    setServerError(null);
    try {
      const result = await login(values.email, values.password);
      if (isMfaChallenge(result)) {
        setMfaChallengeToken(result.mfaChallengeToken);
        return;
      }
      router.replace(destination);
    } catch (err) {
      setServerError(
        getApiErrorMessage(err, "Login failed. Please try again."),
      );
    }
  }

  async function submitSecondStep(code: string, kind: "totp" | "backup") {
    if (!mfaChallengeToken) return;
    setServerError(null);
    try {
      await verifyMfa(mfaChallengeToken, code, kind);
      router.replace(destination);
    } catch (err) {
      setServerError(
        getApiErrorMessage(err, "Verification failed. Please try again."),
      );
      if (kind === "totp") mfa.resetField("totpCode");
      else backup.resetField("backupCode");
      // The challenge lasts 5 minutes; after a lockout or expiry, start over.
      if (
        getApiStatus(err) === 429 ||
        /expired|log in again/i.test(getApiErrorMessage(err))
      ) {
        setMfaChallengeToken(null);
      }
    }
  }

  function startOver() {
    setMfaChallengeToken(null);
    setServerError(null);
    setUseBackup(false);
    mfa.reset();
    backup.reset();
  }

  function switchMethod() {
    setUseBackup((v) => !v);
    setServerError(null);
  }

  if (mfaChallengeToken && useBackup) {
    return (
      <AuthShell
        title="Use a backup code"
        subtitle="Enter one of the backup codes you saved when you set up two-factor sign-in."
        footerNote="Each backup code works once. Set up your new phone from Profile afterwards."
      >
        <form
          onSubmit={backup.handleSubmit((v) =>
            submitSecondStep(v.backupCode, "backup"),
          )}
          noValidate
        >
          <FormField
            label="Backup code"
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            maxLength={9}
            placeholder="ABCD-EFGH"
            autoFocus
            className="text-center font-mono text-lg tracking-[0.2em]"
            error={backup.formState.errors.backupCode?.message}
            {...backup.register("backupCode")}
          />

          {serverError && <ErrorBox message={serverError} />}

          <Button type="submit" isLoading={backup.formState.isSubmitting}>
            Sign in with backup code
          </Button>
          <button
            type="button"
            onClick={switchMethod}
            className="mt-3 w-full text-center text-sm font-bold text-[var(--sevs-navy)] hover:underline"
          >
            Use the code from my app instead
          </button>
          <p className="mt-4 text-center text-sm text-[var(--sevs-text-muted)]">
            Lost your phone and your backup codes? Contact your SACCO office.
          </p>
        </form>
      </AuthShell>
    );
  }

  if (mfaChallengeToken) {
    return (
      <AuthShell
        title="Enter your security code"
        subtitle="Open your authenticator app and enter the 6-digit code for SEVS."
        footerNote="Codes change every 30 seconds. Each code can be used once."
      >
        <form
          onSubmit={mfa.handleSubmit((v) =>
            submitSecondStep(v.totpCode, "totp"),
          )}
          noValidate
        >
          <FormField
            label="6-digit code"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            placeholder="123456"
            autoFocus
            className="text-center font-mono text-lg tracking-[0.4em]"
            error={mfa.formState.errors.totpCode?.message}
            {...mfa.register("totpCode")}
          />

          {serverError && <ErrorBox message={serverError} />}

          <Button type="submit" isLoading={mfa.formState.isSubmitting}>
            Verify and continue
          </Button>
          <button
            type="button"
            onClick={switchMethod}
            className="mt-3 w-full text-center text-sm font-bold text-[var(--sevs-navy)] hover:underline"
          >
            Lost your phone? Use a backup code
          </button>
          <button
            type="button"
            onClick={startOver}
            className="mt-2 w-full text-center text-sm font-bold text-[var(--sevs-navy)] hover:underline"
          >
            Use a different account
          </button>
        </form>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Sign in to access your SEVS account"
      footerNote="Secure access • Verified identity • Auditable activity"
      bottomLink={
        <span className="text-[var(--sevs-text-muted)]">
          Don&apos;t have an account?{" "}
          <Link
            href="/register"
            className="font-bold text-[var(--sevs-navy)] hover:underline"
          >
            Register
          </Link>
        </span>
      }
    >
      <form onSubmit={credentials.handleSubmit(onSubmitCredentials)} noValidate>
        {justRegistered && (
          <p
            role="status"
            className="mb-4 rounded-lg bg-green-50 px-4 py-3 text-sm text-green-800"
          >
            Registration successful. You can now log in. You can add two-factor
            sign-in any time from Profile.
          </p>
        )}
        {passwordChanged && (
          <p
            role="status"
            className="mb-4 rounded-lg bg-green-50 px-4 py-3 text-sm text-green-800"
          >
            Password changed. Log in with your new password.
          </p>
        )}

        <FormField
          label="Email Address"
          type="email"
          autoComplete="email"
          placeholder="Enter your email address"
          error={credentials.formState.errors.email?.message}
          {...credentials.register("email")}
        />
        <PasswordField
          label="Password"
          autoComplete="current-password"
          placeholder="Enter your password"
          error={credentials.formState.errors.password?.message}
          {...credentials.register("password")}
        />

        {serverError && <ErrorBox message={serverError} />}

        <Button type="submit" isLoading={credentials.formState.isSubmitting}>
          Login
        </Button>

        {/* No self-service reset exists yet, so say what to do instead of linking to a missing page. */}
        <p className="mt-4 text-center text-sm text-[var(--sevs-text-muted)]">
          Forgot your password? Contact your SACCO office to reset it.
        </p>
      </form>
    </AuthShell>
  );
}

// useSearchParams needs a Suspense boundary in the App Router.
export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
