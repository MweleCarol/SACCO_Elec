"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { registerSchema, type RegisterFormValues } from "@/lib/validation/auth";
import { mockRegister } from "@/services/mock/auth";
import { AuthShell } from "@/components/auth/AuthShell";
import { FormField } from "@/components/ui/FormField";
import { PasswordField } from "@/components/ui/PasswordField";
import { Button } from "@/components/ui/button";

export default function RegisterPage() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormValues>({ resolver: zodResolver(registerSchema) });

  async function onSubmit(values: RegisterFormValues) {
    setServerError(null);
    setIsSubmitting(true);
    const result = await mockRegister(values);
    setIsSubmitting(false);

    if (!result.success) {
      setServerError(result.message);
      return;
    }

    router.push("/login");
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
          placeholder="Enter your email address"
          error={errors.email?.message}
          {...register("email")}
        />
        <FormField
          label="Full Name"
          placeholder="Enter your full name"
          error={errors.fullName?.message}
          {...register("fullName")}
        />
        <PasswordField
          label="Password"
          placeholder="Enter your password"
          error={errors.password?.message}
          {...register("password")}
        />
        <PasswordField
          label="Confirm Password"
          placeholder="Re-enter your password"
          error={errors.confirmPassword?.message}
          {...register("confirmPassword")}
        />

        {serverError && (
          <p className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{serverError}</p>
        )}

        <Button type="submit" isLoading={isSubmitting}>
          Register
        </Button>
      </form>
    </AuthShell>
  );
}