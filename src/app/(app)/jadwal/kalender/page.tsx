import Link from "next/link";
import type { Metadata } from "next";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { ButtonLink } from "@/components/common/button-link";
import { PageHeader } from "@/components/common/page-shell";
import { requireUser } from "@/lib/auth/session";
import { DAY_NAMES } from "@/lib/dates";
import { prisma } from "@/lib/db/prisma";
import {
  buildCalendarGrid,
  expandSchedules,
  toDateKey,
} from "@/server/services/schedule-occurrences";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Kalender" };

/** Reads `?bulan=YYYY-MM`, falling back to the current month. */
function resolveMonth(value: string | undefined): { year: number; month: number } {
  const match = value?.match(/^(\d{4})-(\d{2})$/);

  if (match) {
    const year = Number(match[1]);
    const month = Number(match[2]) - 1;
    if (year >= 2000 && year <= 2100 && month >= 0 && month <= 11) {
      return { year, month };
    }
  }

  const now = new Date();
  return { year: now.getUTCFullYear(), month: now.getUTCMonth() };
}

function monthParam(year: number, month: number): string {
  return `${year}-${String(month + 1).padStart(2, "0")}`;
}

export default async function KalenderPage({
  searchParams,
}: PageProps<"/jadwal/kalender">) {
  await requireUser();

  const params = await searchParams;
  const { year, month } = resolveMonth(
    typeof params.bulan === "string" ? params.bulan : undefined,
  );

  const monthStart = new Date(Date.UTC(year, month, 1));
  const monthEnd = new Date(Date.UTC(year, month + 1, 1));

  // The grid can spill into the neighbouring months, so activities are fetched
  // across the whole visible range rather than just the month itself.
  const grid = buildCalendarGrid(year, month);
  const gridStart = grid[0];
  const gridEnd = new Date(grid[grid.length - 1]);
  gridEnd.setUTCDate(gridEnd.getUTCDate() + 1);

  const [schedules, activities] = await Promise.all([
    prisma.schedule.findMany({
      where: {
        isActive: true,
        startDate: { lt: gridEnd },
        OR: [{ endDate: null }, { endDate: { gte: gridStart } }],
      },
      select: {
        id: true,
        title: true,
        recurrence: true,
        daysOfWeek: true,
        startDate: true,
        endDate: true,
        startTime: true,
        endTime: true,
        location: { select: { name: true } },
      },
    }),
    prisma.activity.findMany({
      where: { date: { gte: gridStart, lt: gridEnd } },
      orderBy: { startTime: "asc" },
      select: {
        id: true,
        date: true,
        status: true,
        startTime: true,
        location: { select: { name: true } },
      },
    }),
  ]);

  const occurrences = expandSchedules(
    schedules.map((schedule) => ({
      id: schedule.id,
      title: schedule.title,
      recurrence: schedule.recurrence,
      daysOfWeek: schedule.daysOfWeek,
      startDate: schedule.startDate,
      endDate: schedule.endDate,
      startTime: schedule.startTime,
      endTime: schedule.endTime,
      locationName: schedule.location.name,
    })),
    gridStart,
    gridEnd,
  );

  const scheduleByDay = new Map<string, typeof occurrences>();
  for (const occurrence of occurrences) {
    const bucket = scheduleByDay.get(occurrence.dateKey);
    if (bucket) {
      bucket.push(occurrence);
    } else {
      scheduleByDay.set(occurrence.dateKey, [occurrence]);
    }
  }

  const activityByDay = new Map<string, typeof activities>();
  for (const activity of activities) {
    const key = toDateKey(activity.date);
    const bucket = activityByDay.get(key);
    if (bucket) {
      bucket.push(activity);
    } else {
      activityByDay.set(key, [activity]);
    }
  }

  const todayKey = toDateKey(new Date());
  const monthLabel = format(new Date(year, month, 1), "MMMM yyyy", {
    locale: idLocale,
  });

  const previous = monthParam(
    month === 0 ? year - 1 : year,
    month === 0 ? 11 : month - 1,
  );
  const next = monthParam(
    month === 11 ? year + 1 : year,
    month === 11 ? 0 : month + 1,
  );

  return (
    <>
      <PageHeader
        title="Kalender"
        description="Jadwal rencana dan kegiatan yang benar-benar tercatat."
        actions={<ButtonLink href="/jadwal" variant="outline">Semua Jadwal</ButtonLink>}
      />

      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <ButtonLink
            href={`/jadwal/kalender?bulan=${previous}`}
            variant="outline"
            size="icon"
            aria-label="Bulan sebelumnya"
          >
            <ChevronLeft className="size-4" />
          </ButtonLink>
          <h2 className="min-w-44 text-center font-medium">{monthLabel}</h2>
          <ButtonLink
            href={`/jadwal/kalender?bulan=${next}`}
            variant="outline"
            size="icon"
            aria-label="Bulan berikutnya"
          >
            <ChevronRight className="size-4" />
          </ButtonLink>
        </div>

        <Legend />
      </div>

      <div className="overflow-x-auto">
        <div className="border-border grid min-w-3xl grid-cols-7 gap-0.5 overflow-hidden rounded-lg border-2 bg-border shadow-[var(--shadow-brutal)]">
          {DAY_NAMES.map((day) => (
            <div
              key={day}
              className="bg-secondary text-secondary-foreground px-2 py-2 text-center text-xs font-bold uppercase tracking-wide"
            >
              {day}
            </div>
          ))}

          {grid.map((day) => {
            const key = toDateKey(day);
            const inMonth = day >= monthStart && day < monthEnd;
            const daySchedules = scheduleByDay.get(key) ?? [];
            const dayActivities = activityByDay.get(key) ?? [];

            return (
              <div
                key={key}
                className={cn(
                  "min-h-24 p-1.5",
                  inMonth ? "bg-card" : "bg-muted",
                )}
              >
                <span
                  className={cn(
                    "inline-flex size-6 items-center justify-center rounded-full text-xs",
                    key === todayKey && "bg-primary text-primary-foreground border-border border-2 font-bold",
                    !inMonth && "text-muted-foreground",
                  )}
                >
                  {day.getUTCDate()}
                </span>

                <div className="mt-1 space-y-1">
                  {/*
                    Activities first: what actually happened matters more than
                    what was planned, and a planned slot that already has an
                    activity should read as done rather than pending.
                  */}
                  {dayActivities.map((activity) => (
                    <Link
                      key={activity.id}
                      href={`/kegiatan/${activity.id}`}
                      title={`${activity.location.name} — ${activity.startTime}`}
                      className={cn(
                        "border-border block truncate rounded-sm border px-1.5 py-0.5 text-xs font-bold",
                        activity.status === "COMPLETED" &&
                          "bg-green-600/15 text-green-800 dark:text-green-300",
                        activity.status === "DRAFT" &&
                          "bg-amber-500/15 text-amber-800 dark:text-amber-300",
                        activity.status === "CANCELLED" &&
                          "bg-destructive/15 text-destructive line-through",
                      )}
                    >
                      {activity.startTime} {activity.location.name}
                    </Link>
                  ))}

                  {daySchedules.map((occurrence) => (
                    <span
                      key={`${occurrence.scheduleId}-${key}`}
                      title={`${occurrence.title} — ${occurrence.locationName}`}
                      className="text-foreground border-border block truncate rounded-sm border border-dashed px-1.5 py-0.5 text-xs font-medium"
                    >
                      {occurrence.startTime} {occurrence.title}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}

function Legend() {
  return (
    <ul className="text-muted-foreground flex flex-wrap items-center gap-3 text-xs">
      <li className="flex items-center gap-1.5">
        <span className="size-3 rounded border border-dashed" />
        Jadwal
      </li>
      <li className="flex items-center gap-1.5">
        <span className="size-3 rounded bg-amber-500/40" />
        Draft
      </li>
      <li className="flex items-center gap-1.5">
        <span className="size-3 rounded bg-green-600/40" />
        Selesai
      </li>
      <li className="flex items-center gap-1.5">
        <span className="bg-destructive/40 size-3 rounded" />
        Dibatalkan
      </li>
    </ul>
  );
}
