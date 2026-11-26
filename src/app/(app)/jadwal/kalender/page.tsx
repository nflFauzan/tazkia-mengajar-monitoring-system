import Link from "next/link";
import type { Metadata } from "next";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Palette, Sparkles } from "lucide-react";

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
import {
  getIndonesianEventsForMonth,
  getIndonesianEventsMapForRange,
} from "@/lib/indonesian-calendar";
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

  // Indonesian holidays and commemorative days
  const indonesianEventsMap = getIndonesianEventsMapForRange(gridStart, gridEnd);
  const monthEvents = getIndonesianEventsForMonth(year, month);

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
        description="Jadwal rencana kegiatan, tanggal merah nasional, serta pengingat hari besar untuk poster Instagram."
        actions={
          <div className="flex items-center gap-2">
            <ButtonLink href="/konten" variant="outline" className="gap-1.5">
              <Palette className="size-4" />
              Papan Konten IG
            </ButtonLink>
            <ButtonLink href="/jadwal" variant="outline">Semua Jadwal</ButtonLink>
          </div>
        }
      />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
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
          {DAY_NAMES.map((day, idx) => (
            <div
              key={day}
              className={cn(
                "bg-secondary text-secondary-foreground px-2 py-2 text-center text-xs font-bold uppercase tracking-wide",
                idx === 0 && "text-red-600 dark:text-red-400 font-black",
              )}
            >
              {day}
            </div>
          ))}

          {grid.map((day) => {
            const key = toDateKey(day);
            const inMonth = day >= monthStart && day < monthEnd;
            const daySchedules = scheduleByDay.get(key) ?? [];
            const dayActivities = activityByDay.get(key) ?? [];
            const dayEvents = indonesianEventsMap.get(key) ?? [];

            const isSunday = day.getUTCDay() === 0;
            const hasHoliday = dayEvents.some((e) => e.isHoliday);
            const isRedDate = isSunday || hasHoliday;

            return (
              <div
                key={key}
                className={cn(
                  "min-h-24 p-1.5",
                  inMonth ? "bg-card" : "bg-muted",
                  inMonth && hasHoliday && "bg-red-500/5",
                )}
              >
                <span
                  className={cn(
                    "inline-flex size-6 items-center justify-center rounded-full text-xs",
                    key === todayKey &&
                      "bg-primary text-primary-foreground border-border border-2 font-bold",
                    key !== todayKey &&
                      isRedDate &&
                      inMonth &&
                      "text-red-600 font-bold dark:text-red-400",
                    !inMonth && "text-muted-foreground opacity-50",
                  )}
                >
                  {day.getUTCDate()}
                </span>

                <div className="mt-1 space-y-1">
                  {/* Hari Libur Nasional (Tanggal Merah) */}
                  {dayEvents
                    .filter((e) => e.isHoliday)
                    .map((e, idx) => (
                      <span
                        key={`holiday-${key}-${idx}`}
                        title={`Libur Nasional: ${e.name}`}
                        className="border-red-500/40 bg-red-500/15 text-red-700 dark:text-red-300 block truncate rounded-sm border px-1.5 py-0.5 text-[10px] font-bold"
                      >
                        🔴 {e.name}
                      </span>
                    ))}

                  {/* Hari Peringatan Nasional (Cocok untuk Ide Poster IG) */}
                  {dayEvents
                    .filter((e) => !e.isHoliday)
                    .map((e, idx) => (
                      <Link
                        key={`comm-${key}-${idx}`}
                        href={`/konten?tambah=1&title=${encodeURIComponent(
                          "Poster Instagram: " + e.name,
                        )}&targetDate=${e.dateKey}&desc=${encodeURIComponent(
                          "Rencana poster & ucapan media sosial untuk memperingati " +
                            e.name +
                            (e.suggestedContent
                              ? ". Ide: " + e.suggestedContent
                              : ""),
                        )}&contentType=${encodeURIComponent(
                          "Feeds / Poster / Carousel",
                        )}`}
                        title={`Hari Peringatan: ${e.name}. ${
                          e.suggestedContent
                            ? `Ide poster: ${e.suggestedContent}`
                            : "Klik untuk buat ide poster IG!"
                        }`}
                        className="border-purple-500/40 bg-purple-500/10 text-purple-700 hover:bg-purple-500/20 dark:text-purple-300 block truncate rounded-sm border px-1.5 py-0.5 text-[10px] font-bold transition-colors"
                      >
                        🎨 {e.name}
                      </Link>
                    ))}

                  {/* Kegiatan yang Terlaksana */}
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

                  {/* Rencana Jadwal Rutin */}
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

      {/* Panel Agenda Hari Besar & Poster Instagram */}
      <section className="mt-8" aria-label="Agenda Hari Besar & Ide Konten">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="font-heading text-base tracking-tight flex items-center gap-2">
              <Sparkles className="size-4 text-purple-600 dark:text-purple-400" />
              Agenda Hari Besar & Rencana Poster Instagram ({monthLabel})
            </h3>
            <p className="text-muted-foreground text-xs mt-0.5">
              Daftar tanggal merah dan hari peringatan nasional untuk persiapan materi ajar dan publikasi media sosial.
            </p>
          </div>
          <ButtonLink href="/konten" variant="outline" size="sm" className="gap-1.5 text-xs">
            <Palette className="size-3.5" />
            Buka Papan Konten
          </ButtonLink>
        </div>

        {monthEvents.length === 0 ? (
          <div className="rounded-lg border-2 border-border p-4 text-center text-xs text-muted-foreground bg-card">
            Tidak ada hari libur nasional atau peringatan khusus pada bulan {monthLabel}.
          </div>
        ) : (
          <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
            {monthEvents.map((event) => {
              const [, , dayNum] = event.dateKey.split("-");
              return (
                <div
                  key={`${event.dateKey}-${event.name}`}
                  className="rounded-lg border-2 border-border bg-card p-3 shadow-[var(--shadow-brutal-sm)] flex flex-col justify-between gap-2.5"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-heading text-xs font-bold px-2 py-0.5 rounded border border-border bg-muted">
                        {dayNum} {monthLabel.split(" ")[0]}
                      </span>
                      <span
                        className={cn(
                          "text-[10px] font-bold px-1.5 py-0.5 rounded",
                          event.isHoliday
                            ? "bg-red-500/15 text-red-700 dark:text-red-300 border border-red-500/30"
                            : "bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-purple-500/30",
                        )}
                      >
                        {event.isHoliday ? "Libur Nasional" : "Hari Peringatan"}
                      </span>
                    </div>

                    <p className="font-heading text-sm font-bold mt-2">
                      {event.name}
                    </p>

                    {event.suggestedContent ? (
                      <p className="text-muted-foreground text-xs mt-1 italic">
                        💡 {event.suggestedContent}
                      </p>
                    ) : null}
                  </div>

                  <Link
                    href={`/konten?tambah=1&title=${encodeURIComponent(
                      "Poster Instagram: " + event.name,
                    )}&targetDate=${event.dateKey}&desc=${encodeURIComponent(
                      "Rencana poster & ucapan media sosial untuk memperingati " +
                        event.name +
                        (event.suggestedContent
                          ? ". Ide: " + event.suggestedContent
                          : ""),
                    )}&contentType=${encodeURIComponent(
                      "Feeds / Poster / Carousel",
                    )}`}
                    className="inline-flex items-center justify-center gap-1.5 rounded-md border-2 border-border bg-primary/10 px-2.5 py-1.5 text-xs font-bold text-primary hover:bg-primary hover:text-primary-foreground transition-colors mt-1"
                  >
                    <Palette className="size-3.5" />
                    Buat Rencana Poster IG
                  </Link>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </>
  );
}

function Legend() {
  return (
    <ul className="text-muted-foreground flex flex-wrap items-center gap-3 text-xs">
      <li className="flex items-center gap-1.5">
        <span className="size-3 rounded border border-dashed" />
        Jadwal Rutin
      </li>
      <li className="flex items-center gap-1.5">
        <span className="size-3 rounded bg-amber-500/40" />
        Draft Kegiatan
      </li>
      <li className="flex items-center gap-1.5">
        <span className="size-3 rounded bg-green-600/40" />
        Selesai
      </li>
      <li className="flex items-center gap-1.5">
        <span className="bg-destructive/40 size-3 rounded" />
        Dibatalkan
      </li>
      <li className="flex items-center gap-1.5">
        <span className="size-3 rounded bg-red-500/40" />
        Libur Nasional
      </li>
      <li className="flex items-center gap-1.5">
        <span className="size-3 rounded bg-purple-500/40" />
        Hari Peringatan (Poster IG)
      </li>
    </ul>
  );
}
