import clsx from "clsx";
import type { ReactNode } from "react";

export function SectionHeader({
  title,
  description
}: {
  title: string;
  description?: string;
}) {
  return (
    <div className="mb-5">
      <h2 className="text-2xl font-bold text-slate-950">{title}</h2>
      {description ? <p className="mt-2 max-w-3xl text-sm text-slate-600">{description}</p> : null}
    </div>
  );
}

export function Panel({
  children,
  className
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={clsx("rounded-lg border border-slate-200 bg-white p-5 shadow-sm", className)}>
      {children}
    </section>
  );
}

export function FieldLabel({
  label,
  children
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate-700">{label}</span>
      {children}
    </label>
  );
}

export function ErrorMessage({ message }: { message?: string | null }) {
  if (!message) return null;
  return (
    <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
      {message}
    </div>
  );
}

export function InfoMessage({ message }: { message?: string | null }) {
  if (!message) return null;
  return (
    <div className="whitespace-pre-line rounded-md border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
      {message}
    </div>
  );
}

export function StatusBadge({ children, tone = "slate" }: { children: ReactNode; tone?: Tone }) {
  return (
    <span
      className={clsx(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold",
        toneStyles[tone]
      )}
    >
      {children}
    </span>
  );
}

type Tone = "slate" | "green" | "orange" | "red" | "blue";

const toneStyles: Record<Tone, string> = {
  slate: "border-slate-200 bg-slate-50 text-slate-700",
  green: "border-green-200 bg-green-50 text-green-700",
  orange: "border-orange-200 bg-orange-50 text-orange-700",
  red: "border-red-200 bg-red-50 text-red-700",
  blue: "border-blue-200 bg-blue-50 text-blue-700"
};

export function fileStatusLabel(status: string) {
  const labels: Record<string, string> = {
    ADDED: "새 파일",
    MODIFIED: "수정됨",
    DELETED: "삭제됨",
    RENAMED: "이름 변경됨",
    UNTRACKED: "추적되지 않음",
    UNKNOWN: "상태 확인 필요"
  };
  return labels[status] ?? status;
}

export function decisionLabel(decision: string) {
  const labels: Record<string, string> = {
    KEEP: "유지",
    RESTORE: "되돌리기 예정",
    UNDECIDED: "미결정"
  };
  return labels[decision] ?? decision;
}

export function decisionTone(decision: string): Tone {
  if (decision === "KEEP") return "green";
  if (decision === "RESTORE") return "orange";
  return "slate";
}

export function statusTone(status: string): Tone {
  if (status === "UNTRACKED") return "blue";
  if (status === "DELETED") return "red";
  if (status === "ADDED") return "green";
  if (status === "RENAMED") return "orange";
  return "slate";
}
