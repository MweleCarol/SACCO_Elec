/* eslint-disable @next/next/no-img-element -- candidate photos come from the SACCO's own server */
import clsx from "clsx";

// A candidate's photo, or their initials when there is none.
export function CandidateAvatar({ name, photoUrl, size = "md" }: { name: string; photoUrl: string | null; size?: "md" | "lg" }) {
  const box = size === "lg" ? "h-14 w-14 text-base" : "h-11 w-11 text-sm";
  if (photoUrl) {
    return <img src={photoUrl} alt="" className={clsx(box, "shrink-0 rounded-full object-cover")} />;
  }
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");
  return (
    <span aria-hidden="true" className={clsx(box, "flex shrink-0 items-center justify-center rounded-full bg-[var(--sevs-navy)]/10 font-bold text-[var(--sevs-navy)]")}>
      {initials}
    </span>
  );
}