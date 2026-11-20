"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { PASSWORD_RULES_HINT, registerSchema, type RegisterFormValues } from "@/lib/validation/auth";
import * as authService from "@/services/auth.service";
import { getApiErrorMessage, getApiFieldErrors } from "@/services/api/errors";
import { AuthShell } from "@/components/auth/AuthShell";
import { FormField } from "@/components/ui/FormField";
import { PasswordField } from "@/components/ui/PasswordField";
import { Button } from "@/components/ui/button";

const FIELDS: (keyof RegisterFormValues)[] = ["membershipNumber", "email", "fullName", "password", "confirmPassword"];

export default function RegisterPage() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>({ resolver: zodResolver(registerSchema) });

  async function onSubmit(values: RegisterFormValues) {
    setServerError(null);
    try {
      await authService.register(values);
      router.push("/login?registered=1");
    } catch (err) {
      // Put the server's field messages next to the matching fields.
      const fieldErrors = getApiFieldErrors(err);
      fieldErrors.forEach(({ field, message }) => {
        if ((FIELDS as string[]).includes(field)) setError(field as keyof RegisterFormValues, { message });
      });
      // The backend deliberately gives one message for any membership mismatch,
      // so it never reveals which detail was wrong.
      if (fieldErrors.length === 0) setServerError(getApiErrorMessage(err, "Registration failed. Please try again."));
    }
  }

  return (
    <AuthShell
      title="Create your account"
      subtitle="Register using your SACCO membership details."
      footerNote="Membership information is used for election registration and eligibility verification."
      bottomLink={
        <span className="text-[var(--sevs-text-muted)]">
          Already registered?{" "}
          <Link href="/login" className="font-bold text-[var(--sevs-navy)] hover:underline">
            Login
          </Link>
        </span>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <FormField
          label="Membership Number"
          placeholder="Enter your SACCO membership number"
          error={errors.membershipNumber?.message}
          {...register("membershipNumber")}
        />
        <FormField
          label="Email Address"
          type="email"
          autoComplete="email"
          placeholder="Enter your email address"
          error={errors.email?.message}
          {...register("email")}
        />
        <FormField
          label="Full Name"
          placeholder="As registered with the SACCO"
          autoComplete="name"
          error={errors.fullName?.message}
          {...register("fullName")}
        />
        <PasswordField
          label="Password"
          placeholder="Create a password"
          hint={PASSWORD_RULES_HINT}
          autoComplete="new-password"
          error={errors.password?.message}
          {...register("password")}
        />
        <PasswordField
          label="Confirm Password"
          placeholder="Re-enter your password"
          autoComplete="new-password"
          error={errors.confirmPassword?.message}
          {...register("confirmPassword")}
        />

        {serverError && (
          <p role="alert" className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
            {serverError}
          </p>
        )}

        <Button type="submit" isLoading={isSubmitting}>
          Register
        </Button>
      </form>
    </AuthShell>
  );
}