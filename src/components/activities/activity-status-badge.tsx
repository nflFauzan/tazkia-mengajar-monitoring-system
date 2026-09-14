import type { ActivityStatus } from "@prisma/client";

import { Badge } from "@/components/ui/badge";

/**
 * One place that decides how an activity status looks and reads, so the
 * dashboard, the history list and the detail page can never disagree about
 * what "DRAFT" is called or what colour it is.
 */
const STATUS_PRESENTATION: Record<
  ActivityStatus,
  { label: string; variant: "default" | "secondary" | "outline" | "destructive" }
> = {
  DRAFT: { label: "Draft", variant: "secondary" },
  COMPLETED: { label: "Selesai", variant: "default" },
  CANCELLED: { label: "Dibatalkan", variant: "destructive" },
};

export function ActivityStatusBadge({ status }: { status: ActivityStatus }) {
  const { label, variant } = STATUS_PRESENTATION[status];
  return <Badge variant={variant}>{label}</Badge>;
}

export function getActivityStatusLabel(status: ActivityStatus): string {
  return STATUS_PRESENTATION[status].label;
}
