import type { ReactNode } from "react";
import { AlertCircle } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * The shared furniture every page in the app is built from.
 *
 * These live together because they are small, always used as a set, and change
 * as a set — splitting them into one file each would add imports without adding
 * clarity.
 */

interface PageHeaderProps {
  title: string;
  description?: string;
  /** Primary actions: top-right on desktop, below the title on mobile. */
  actions?: ReactNode;
}

export function PageHeader({ title, description, actions }: PageHeaderProps) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        <h1 className="font-heading text-2xl tracking-tight uppercase">{title}</h1>
        {description ? (
          <p className="text-muted-foreground mt-1 text-sm">{description}</p>
        ) : null}
      </div>
      {actions ? (
        <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>
      ) : null}
    </div>
  );
}

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

/**
 * Empty states name the thing that is missing and offer the next step, rather
 * than just saying "no data" (PRD section 42).
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "bg-card flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-border px-6 py-14 text-center",
        className,
      )}
    >
      {Icon ? (
        <div className="bg-secondary text-secondary-foreground border-border mb-4 flex size-12 items-center justify-center rounded-full border-2">
          <Icon className="size-5" />
        </div>
      ) : null}
      <p className="font-heading text-lg tracking-tight">{title}</p>
      {description ? (
        <p className="text-muted-foreground mt-1 max-w-sm text-sm">
          {description}
        </p>
      ) : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

interface ErrorStateProps {
  title?: string;
  description?: string;
  action?: ReactNode;
}

export function ErrorState({
  title = "Terjadi kesalahan",
  description = "Data gagal dimuat. Silakan muat ulang halaman.",
  action,
}: ErrorStateProps) {
  return (
    <div className="border-destructive bg-destructive/10 shadow-[4px_4px_0_0_var(--destructive)] flex flex-col items-center justify-center rounded-lg border-2 px-6 py-14 text-center">
      <div className="bg-destructive border-border text-white dark:text-black mb-4 flex size-12 items-center justify-center rounded-full border-2">
        <AlertCircle className="size-5" />
      </div>
      <p className="font-heading text-lg tracking-tight">{title}</p>
      <p className="text-muted-foreground mt-1 max-w-sm text-sm">
        {description}
      </p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

interface StatCardProps {
  label: string;
  value: string | number;
  hint?: string;
  icon?: LucideIcon;
}

export function StatCard({ label, value, hint, icon: Icon }: StatCardProps) {
  return (
    <div className="bg-card border-border rounded-lg border-2 p-4 shadow-[var(--shadow-brutal)]">
      <div className="flex items-start justify-between gap-3">
        <p className="text-muted-foreground text-xs font-bold uppercase tracking-wide">{label}</p>
        {Icon ? (
          <Icon className="text-muted-foreground size-4 shrink-0" aria-hidden />
        ) : null}
      </div>
      <p className="font-heading mt-2 text-3xl tabular-nums">{value}</p>
      {hint ? <p className="text-muted-foreground mt-1 text-xs">{hint}</p> : null}
    </div>
  );
}
