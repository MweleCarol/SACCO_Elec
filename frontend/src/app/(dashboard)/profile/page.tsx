"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { Pencil, X, Loader2, ShieldCheck, KeyRound, AlertCircle } from "lucide-react";

type ProfileFormValues = {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
};

const NAME_PATTERN = /^[A-Za-z][A-Za-z'-]{1,49}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const KE_PHONE_PATTERN = /^(?:\+254|0)(7|1)\d{8}$/;

// Mock — replace with the authenticated member's profile from the API.
const INITIAL_PROFILE = {
  firstName: "Wanjiru",
  lastName: "Mwangi",
  membershipNumber: "SACCO-2024-0123",
  nationalId: "12345678",
  email: "wanjiru.mwangi@example.com",
  phoneNumber: "0712345678",
  joinedDate: "14 Feb 2024",
  totpEnabled: true,
};

const inputClasses =
  "w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-[#0C1657] focus:ring-2 focus:ring-[#0C1657]/20";
const errorInputClasses = "border-red-400 focus:border-red-400 focus:ring-red-400/20";

function ErrorText({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p className="flex items-start gap-1 text-xs text-red-600">
      <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
      {message}
    </p>
  );
}

function maskNationalId(id: string) {
  return `${"•".repeat(Math.max(id.length - 3, 0))}${id.slice(-3)}`;
}

export default function ProfilePage() {
  const [profile, setProfile] = React.useState(INITIAL_PROFILE);
  const [editing, setEditing] = React.useState(false);
  const [saveError, setSaveError] = React.useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ProfileFormValues>({
    mode: "onBlur",
    defaultValues: {
      firstName: profile.firstName,
      lastName: profile.lastName,
      email: profile.email,
      phoneNumber: profile.phoneNumber,
    },
  });

  const startEditing = () => {
    reset({
      firstName: profile.firstName,
      lastName: profile.lastName,
      email: profile.email,
      phoneNumber: profile.phoneNumber,
    });
    setSaveError(null);
    setEditing(true);
  };

  const onSubmit = async (values: ProfileFormValues) => {
    setSaveError(null);
    try {
      // TODO: wire up to the profile-update API.
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setProfile((prev) => ({ ...prev, ...values }));
      setEditing(false);
    } catch {
      setSaveError("We couldn't save your changes. Please try again.");
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-xl font-semibold text-slate-900 sm:text-2xl">Profile</h1>
        <p className="mt-1 text-sm text-slate-500">Your membership details and account security.</p>
      </div>

      {/* Membership details */}
      <section className="rounded-xl border border-slate-200 bg-white">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h2 className="text-sm font-semibold text-slate-900">Membership details</h2>
          {!editing ? (
            <button
              onClick={startEditing}
              className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50"
            >
              <Pencil className="h-3.5 w-3.5" />
              Edit
            </button>
          ) : (
            <button
              onClick={() => setEditing(false)}
              className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50"
            >
              <X className="h-3.5 w-3.5" />
              Cancel
            </button>
          )}
        </div>

        {!editing ? (
          <dl className="grid grid-cols-1 gap-x-6 gap-y-4 px-5 py-5 sm:grid-cols-2">
            <div>
              <dt className="text-xs text-slate-500">Full name</dt>
              <dd className="mt-0.5 text-sm font-medium text-slate-900">
                {profile.firstName} {profile.lastName}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">Membership number</dt>
              <dd className="mt-0.5 font-mono text-sm font-medium text-slate-900">{profile.membershipNumber}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">National ID</dt>
              <dd className="mt-0.5 font-mono text-sm font-medium text-slate-900">
                {maskNationalId(profile.nationalId)}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">Member since</dt>
              <dd className="mt-0.5 text-sm font-medium text-slate-900">{profile.joinedDate}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">Email address</dt>
              <dd className="mt-0.5 text-sm font-medium text-slate-900">{profile.email}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">Phone number</dt>
              <dd className="mt-0.5 text-sm font-medium text-slate-900">{profile.phoneNumber}</dd>
            </div>
          </dl>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4 px-5 py-5">
            {saveError && (
              <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                {saveError}
              </div>
            )}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="firstName" className="text-xs font-medium text-slate-600">
                  First name
                </label>
                <input
                  id="firstName"
                  className={`${inputClasses} ${errors.firstName ? errorInputClasses : ""}`}
                  {...register("firstName", {
                    required: "First name is required.",
                    pattern: { value: NAME_PATTERN, message: "Letters only, please." },
                  })}
                />
                <ErrorText message={errors.firstName?.message} />
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="lastName" className="text-xs font-medium text-slate-600">
                  Last name
                </label>
                <input
                  id="lastName"
                  className={`${inputClasses} ${errors.lastName ? errorInputClasses : ""}`}
                  {...register("lastName", {
                    required: "Last name is required.",
                    pattern: { value: NAME_PATTERN, message: "Letters only, please." },
                  })}
                />
                <ErrorText message={errors.lastName?.message} />
              </div>
              <div className="flex flex-col gap-1.5 sm:col-span-2">
                <label htmlFor="email" className="text-xs font-medium text-slate-600">
                  Email address
                </label>
                <input
                  id="email"
                  type="email"
                  className={`${inputClasses} ${errors.email ? errorInputClasses : ""}`}
                  {...register("email", {
                    required: "Email address is required.",
                    pattern: { value: EMAIL_PATTERN, message: "Enter a valid email address." },
                  })}
                />
                <ErrorText message={errors.email?.message} />
              </div>
              <div className="flex flex-col gap-1.5 sm:col-span-2">
                <label htmlFor="phoneNumber" className="text-xs font-medium text-slate-600">
                  Phone number
                </label>
                <input
                  id="phoneNumber"
                  type="tel"
                  className={`${inputClasses} ${errors.phoneNumber ? errorInputClasses : ""}`}
                  {...register("phoneNumber", {
                    required: "Phone number is required.",
                    pattern: { value: KE_PHONE_PATTERN, message: "Enter a valid Kenyan phone number." },
                  })}
                />
                <ErrorText message={errors.phoneNumber?.message} />
              </div>
            </div>

            <p className="text-xs text-slate-400">
              Membership number and National ID are fixed to your SACCO record and can&apos;t be edited here.
            </p>

            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center justify-center gap-2 self-start rounded-lg bg-[#0C1657] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0C1657]/90 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {isSubmitting ? "Saving…" : "Save changes"}
            </button>
          </form>
        )}
      </section>

      {/* Security */}
      <section className="rounded-xl border border-slate-200 bg-white">
        <div className="border-b border-slate-100 px-5 py-4">
          <h2 className="text-sm font-semibold text-slate-900">Security</h2>
        </div>
        <div className="flex flex-col divide-y divide-slate-100">
          <div className="flex items-center justify-between gap-3 px-5 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-50">
                <ShieldCheck className="h-4 w-4 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-900">Two-factor authentication</p>
                <p className="text-xs text-slate-500">
                  {profile.totpEnabled ? "Enabled via authenticator app" : "Not yet enabled"}
                </p>
              </div>
            </div>
            <span className="shrink-0 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
              {profile.totpEnabled ? "Active" : "Inactive"}
            </span>
          </div>
          <div className="flex items-center justify-between gap-3 px-5 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100">
                <KeyRound className="h-4 w-4 text-slate-500" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-900">Password</p>
                <p className="text-xs text-slate-500">Last changed 3 months ago</p>
              </div>
            </div>
            <button className="shrink-0 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50">
              Change
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}