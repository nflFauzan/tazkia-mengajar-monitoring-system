import Link from "next/link";
import type { Metadata } from "next";
import {
  CalendarDays,
  ClipboardList,
  HeartHandshake,
  MapPin,
  Plus,
  UserCheck,
  Users,
} from "lucide-react";

import { ActivityStatusBadge } from "@/components/activities/activity-status-badge";
import { ButtonLink } from "@/components/common/button-link";
import {
  EmptyState,
  PageHeader,
  StatCard,
} from "@/components/common/page-shell";
import { Badge } from "@/components/ui/badge";
import { requireUser } from "@/lib/auth/session";
import { formatDaysOfWeek, formatTanggalSingkat } from "@/lib/dates";
import { getDashboardStats } from "@/server/services/dashboard";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  await requireUser();
  const stats = await getDashboardStats();

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Ringkasan kegiatan Tazkia Mengajar."
        actions={
          <>
            <ButtonLink href="/kegiatan/baru">
              <Plus className="size-4" />
              Tambah Kegiatan
            </ButtonLink>
            <ButtonLink href="/tim" variant="outline">
              Kelola Tim
            </ButtonLink>
          </>
        }
      />

      <section
        aria-label="Statistik"
        className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6"
      >
        <StatCard
          label="Total kegiatan"
          value={stats.totalActivities}
          hint="Tidak termasuk yang dibatalkan"
          icon={ClipboardList}
        />
        <StatCard
          label="Kegiatan bulan ini"
          value={stats.activitiesThisMonth}
          icon={CalendarDays}
        />
        <StatCard
          label="Penerima manfaat"
          value={stats.totalBeneficiaries}
          hint="Dari kegiatan selesai"
          icon={HeartHandshake}
        />
        <StatCard
          label="Anggota tim aktif"
          value={stats.totalTeamMembers}
          icon={Users}
        />
        <StatCard
          label="Tempat aktif"
          value={stats.totalLocations}
          icon={MapPin}
        />
        <StatCard
          label="Kehadiran tim"
          value={
            stats.teamAttendanceRate === null
              ? "—"
              : `${stats.teamAttendanceRate}%`
          }
          hint={
            stats.teamAttendanceRate === null
              ? "Belum ada data absensi"
              : "Hadir dari total tercatat"
          }
          icon={UserCheck}
        />
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section aria-label="Kegiatan terbaru">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-heading text-lg tracking-tight">Kegiatan Terbaru</h2>
            <ButtonLink href="/kegiatan" variant="ghost" size="sm">
              Lihat semua
            </ButtonLink>
          </div>

          {stats.recentActivities.length === 0 ? (
            <EmptyState
              icon={ClipboardList}
              title="Belum ada kegiatan."
              description="Catat kegiatan pertama untuk mulai membangun histori dan laporan."
              action={
                <ButtonLink href="/kegiatan/baru">
                  Buat kegiatan pertama
                </ButtonLink>
              }
            />
          ) : (
            <ul className="divide-y-2 divide-border/15 border-border rounded-lg border-2 shadow-[var(--shadow-brutal)] overflow-hidden">
              {stats.recentActivities.map((activity) => (
                <li key={activity.id}>
                  <Link
                    href={`/kegiatan/${activity.id}`}
                    className="hover:bg-muted/50 flex items-center gap-3 p-3 transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {activity.locationName}
                      </p>
                      <p className="text-muted-foreground mt-0.5 text-xs">
                        {formatTanggalSingkat(activity.date)} ·{" "}
                        {activity.beneficiaryCount} penerima manfaat ·{" "}
                        {activity.teamCount} tim
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1.5">
                      {activity.hasReport ? (
                        <Badge variant="outline">Laporan</Badge>
                      ) : null}
                      <ActivityStatusBadge status={activity.status} />
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section aria-label="Jadwal mendatang">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-heading text-lg tracking-tight">Jadwal</h2>
            <ButtonLink href="/jadwal" variant="ghost" size="sm">
              Lihat semua
            </ButtonLink>
          </div>

          {stats.upcomingSchedules.length === 0 ? (
            <EmptyState
              icon={CalendarDays}
              title="Belum ada jadwal."
              description="Buat jadwal rutin agar kegiatan lebih mudah direncanakan."
            />
          ) : (
            <ul className="divide-y-2 divide-border/15 border-border rounded-lg border-2 shadow-[var(--shadow-brutal)] overflow-hidden">
              {stats.upcomingSchedules.map((schedule) => (
                <li key={schedule.id} className="p-3">
                  <p className="truncate text-sm font-medium">
                    {schedule.title}
                  </p>
                  <p className="text-muted-foreground mt-0.5 text-xs">
                    {schedule.locationName} ·{" "}
                    {formatDaysOfWeek(schedule.daysOfWeek)} ·{" "}
                    {schedule.startTime}–{schedule.endTime} WIB
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}
