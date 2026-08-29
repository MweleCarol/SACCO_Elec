"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema, type LoginFormValues } from "@/lib/validation/auth";
import { mockLogin } from "@/services/mock/auth";
import { AuthShell } from "@/components/auth/AuthShell";
import { FormField } from "@/components/ui/FormField";
import { PasswordField } from "@/components/ui/PasswordField";
import { Button } from "@/components/ui/button";

export default function LoginPage() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({ resolver: zodResolver(loginSchema) });

  async function onSubmit(values: LoginFormValues) {
    setServerError(null);
    setIsSubmitting(true);
    const result = await mockLogin(values);
    setIsSubmitting(false);

    if (!result.success) {
      setServerError(result.message);
      return;
    }

    document.cookie = `sevs_uid=${result.user!.id}; path=/; max-age=86400`;
    router.push("/dashboard");
  }

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Sign in to access your SEVS account"
      footerNote="Secure access • Verified identity • Auditable activity"
      bottomLink={
        <span className="text-[var(--sevs-text-muted)]">
          Don&apos;t have an account?{" "}
          <Link href="/register" className="font-bold text-[var(--sevs-navy)] hover:underline">
            Register
          </Link>
        </span>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <FormField
          label="Email Address"
          type="email"
          placeholder="Enter your email address"
          error={errors.email?.message}
          {...register("email")}
        />
        <PasswordField
          label="Password"
          placeholder="Enter your password"
          error={errors.password?.message}
          {...register("password")}
        />

        <div className="mb-4 text-right">
          <Link href="/forgot-password" className="text-sm font-bold text-[var(--sevs-navy)] hover:underline">
            Forgot password?
          </Link>
        </div>

        {serverError && (
          <p className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{serverError}</p>
        )}

        <Button type="submit" isLoading={isSubmitting}>
          Login
        </Button>

        <p className="mt-4 text-center text-sm text-[var(--sevs-text-muted)]">
          Your account may require multi-factor authentication.
        </p>
      </form>
    </AuthShell>
  );
}