"use client";

import * as React from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { ShieldCheck, Eye, EyeOff, AlertCircle, Loader2 } from "lucide-react";

type LoginFormValues = {
  email: string;
  password: string;
  rememberMe: boolean;
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const inputClasses =
  "w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-[#0C1657] focus:ring-2 focus:ring-[#0C1657]/20";

const errorInputClasses =
  "border-red-400 focus:border-red-400 focus:ring-red-400/20";

const labelClasses = "text-xs font-medium text-white/80";

function ErrorText({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p className="flex items-start gap-1 text-xs text-red-300">
      <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
      {message}
    </p>
  );
}

export default function LoginPage() {
  const [showPassword, setShowPassword] = React.useState(false);
  const [submitError, setSubmitError] = React.useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    mode: "onBlur",
    defaultValues: { email: "", password: "", rememberMe: false },
  });

  const onSubmit = async (values: LoginFormValues) => {
    setSubmitError(null);
    try {
      // TODO: wire up to the backend authentication API.
      await new Promise((resolve) => setTimeout(resolve, 1200));
      console.log("Login submitted", values);
    } catch {
      setSubmitError("We couldn't sign you in. Check your details and try again.");
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F2F4F7] px-3 py-6 sm:px-6 sm:py-10 lg:px-8">
      <form
        onSubmit={handleSubmit(onSubmit)}
        noValidate
        className="w-full max-w-md rounded-xl bg-[#0C1657] p-5 shadow-2xl sm:rounded-2xl sm:p-8 md:p-10"
      >
        {/* Header */}
        <div className="flex flex-col items-center text-center">
          <div className="flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-white/5 sm:h-12 sm:w-12">
            <ShieldCheck className="h-5 w-5 text-white sm:h-6 sm:w-6" />
          </div>
          <span className="mt-3 text-lg font-bold tracking-tight text-white sm:text-xl">SEVS</span>
          <h1 className="mt-3 text-base font-semibold text-white sm:mt-4 sm:text-lg">Welcome back</h1>
          <p className="mt-1 max-w-sm text-xs text-white/60 sm:text-sm">
            Sign in with your registered SACCO email to cast or manage your vote.
          </p>
        </div>

        {submitError && (
          <div className="mt-6 flex items-start gap-2 rounded-lg border border-red-400/30 bg-red-400/10 px-3.5 py-2.5 text-sm text-red-300">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            {submitError}
          </div>
        )}

        <div className="mt-5 flex flex-col gap-4 sm:mt-7 sm:gap-5">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="email" className={labelClasses}>
              Email address
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              className={`${inputClasses} ${errors.email ? errorInputClasses : ""}`}
              {...register("email", {
                required: "Email address is required.",
                pattern: { value: EMAIL_PATTERN, message: "Enter a valid email address." },
              })}
            />
            <ErrorText message={errors.email?.message} />
          </div>

          <div className="flex flex-col gap-1.5">
            <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
              <label htmlFor="password" className={labelClasses}>
                Password
              </label>
              <Link href="/forgot-password" className="text-xs font-medium text-white/70 hover:text-white">
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                placeholder="Enter your password"
                className={`${inputClasses} pr-10 ${errors.password ? errorInputClasses : ""}`}
                {...register("password", {
                  required: "Password is required.",
                  minLength: { value: 8, message: "Password must be at least 8 characters." },
                })}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="absolute right-0 top-0 flex h-full w-10 items-center justify-center text-slate-400 hover:text-[#0C1657]"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <ErrorText message={errors.password?.message} />
          </div>

          <label className="flex select-none items-center gap-2 text-sm text-white/70">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-white/30 bg-transparent accent-white"
              {...register("rememberMe")}
            />
            Remember me on this device
          </label>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-[#0C1657] transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-70 sm:mt-7"
        >
          {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
          {isSubmitting ? "Signing in…" : "Sign in"}
        </button>

        <p className="mt-5 text-center text-xs text-white/60 sm:mt-6 sm:text-sm">
          Don&apos;t have a membership account yet?{" "}
          <Link href="/register" className="font-medium text-white hover:underline">
            Register here
          </Link>
        </p>
      </form>
    </div>
  );
}