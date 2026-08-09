"use client";

import * as React from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { ShieldCheck, Eye, EyeOff, AlertCircle, Loader2 } from "lucide-react";

type RegisterFormValues = {
  fullName: string;
  membershipNumber: string;
  nationalId: string;
  email: string;
  phoneNumber: string;
  password: string;
  confirmPassword: string;
};

const FULL_NAME_PATTERN = /^[A-Za-z][A-Za-z'-]*(?:\s+[A-Za-z][A-Za-z'-]*)+$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const KE_PHONE_PATTERN = /^(?:\+254|0)(7|1)\d{8}$/;
const NATIONAL_ID_PATTERN = /^\d{7,8}$/;
const MEMBERSHIP_NUMBER_PATTERN = /^[A-Za-z0-9-]{4,20}$/;
const STRONG_PASSWORD_PATTERN = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

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

export default function RegisterPage() {
  const [showPassword, setShowPassword] = React.useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = React.useState(false);
  const [submitError, setSubmitError] = React.useState<string | null>(null);

  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>({
    mode: "onBlur",
    defaultValues: {
      fullName: "",
      membershipNumber: "",
      nationalId: "",
      email: "",
      phoneNumber: "",
      password: "",
      confirmPassword: "",
    },
  });

  const onSubmit = async (values: RegisterFormValues) => {
    setSubmitError(null);
    try {
      // TODO: wire up to the backend authentication API.
      await new Promise((resolve) => setTimeout(resolve, 1200));
      console.log("Registration submitted", values);
    } catch {
      setSubmitError("We couldn't create your account. Please review your details and try again.");
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F2F4F7] px-3 py-6 sm:px-6 sm:py-10 lg:px-8">
      <form
        onSubmit={handleSubmit(onSubmit)}
        noValidate
        className="w-full max-w-2xl rounded-xl bg-[#0C1657] p-5 shadow-2xl sm:rounded-2xl sm:p-8 md:p-10"
      >
        {/* Header */}
        <div className="flex flex-col items-center text-center">
          <div className="flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-white/5 sm:h-12 sm:w-12">
            <ShieldCheck className="h-5 w-5 text-white sm:h-6 sm:w-6" />
          </div>
          <span className="mt-3 text-lg font-bold tracking-tight text-white sm:text-xl">SEVS</span>
          <h1 className="mt-3 text-base font-semibold text-white sm:mt-4 sm:text-lg">Create your account</h1>
          <p className="mt-1 max-w-sm text-xs text-white/60 sm:text-sm">
            Register with your SACCO membership details to vote in upcoming elections.
          </p>
        </div>

        {submitError && (
          <div className="mt-6 flex items-start gap-2 rounded-lg border border-red-400/30 bg-red-400/10 px-3.5 py-2.5 text-sm text-red-300">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            {submitError}
          </div>
        )}

        {/* Fields */}
        <div className="mt-5 grid grid-cols-1 gap-4 sm:mt-7 sm:grid-cols-2 sm:gap-5">
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <label htmlFor="fullName" className={labelClasses}>
              Full name
            </label>
            <input
              id="fullName"
              placeholder="Wanjiru Mwangi"
              className={`${inputClasses} ${errors.fullName ? errorInputClasses : ""}`}
              {...register("fullName", {
                required: "Full name is required.",
                pattern: { value: FULL_NAME_PATTERN, message: "Enter your first and last name." },
              })}
            />
            <ErrorText message={errors.fullName?.message} />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="membershipNumber" className={labelClasses}>
              Membership number
            </label>
            <input
              id="membershipNumber"
              placeholder="SACCO-2024-0123"
              className={`${inputClasses} font-mono ${errors.membershipNumber ? errorInputClasses : ""}`}
              {...register("membershipNumber", {
                required: "Membership number is required.",
                pattern: {
                  value: MEMBERSHIP_NUMBER_PATTERN,
                  message: "Enter a valid membership number.",
                },
              })}
            />
            <ErrorText message={errors.membershipNumber?.message} />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="nationalId" className={labelClasses}>
              National ID
            </label>
            <input
              id="nationalId"
              inputMode="numeric"
              placeholder="12345678"
              className={`${inputClasses} font-mono ${errors.nationalId ? errorInputClasses : ""}`}
              {...register("nationalId", {
                required: "National ID is required.",
                pattern: { value: NATIONAL_ID_PATTERN, message: "Enter a valid 7-8 digit ID." },
              })}
            />
            <ErrorText message={errors.nationalId?.message} />
          </div>

          <div className="flex flex-col gap-1.5 sm:col-span-2">
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

          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <label htmlFor="phoneNumber" className={labelClasses}>
              Phone number
            </label>
            <input
              id="phoneNumber"
              type="tel"
              autoComplete="tel"
              placeholder="0712 345 678"
              className={`${inputClasses} ${errors.phoneNumber ? errorInputClasses : ""}`}
              {...register("phoneNumber", {
                required: "Phone number is required.",
                pattern: { value: KE_PHONE_PATTERN, message: "Enter a valid Kenyan phone number." },
              })}
            />
            <p className="text-xs text-white/50">We&apos;ll send election notifications and OTPs to this number.</p>
            <ErrorText message={errors.phoneNumber?.message} />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="password" className={labelClasses}>
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                placeholder="Create a password"
                className={`${inputClasses} pr-10 ${errors.password ? errorInputClasses : ""}`}
                {...register("password", {
                  required: "Password is required.",
                  pattern: {
                    value: STRONG_PASSWORD_PATTERN,
                    message: "8+ chars with upper, lower & a number.",
                  },
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

          <div className="flex flex-col gap-1.5">
            <label htmlFor="confirmPassword" className={labelClasses}>
              Confirm password
            </label>
            <div className="relative">
              <input
                id="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                autoComplete="new-password"
                placeholder="Re-enter your password"
                className={`${inputClasses} pr-10 ${errors.confirmPassword ? errorInputClasses : ""}`}
                {...register("confirmPassword", {
                  required: "Please confirm your password.",
                  validate: (value) => value === getValues().password || "Passwords do not match.",
                })}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword((v) => !v)}
                aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                className="absolute right-0 top-0 flex h-full w-10 items-center justify-center text-slate-400 hover:text-[#0C1657]"
              >
                {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <ErrorText message={errors.confirmPassword?.message} />
          </div>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-[#0C1657] transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-70 sm:mt-7"
        >
          {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
          {isSubmitting ? "Creating account…" : "Register"}
        </button>

        <p className="mt-5 text-center text-xs text-white/60 sm:mt-6 sm:text-sm">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-white hover:underline">
            Sign in
          </Link>
        </p>
      </form>
    </div>
  );
}