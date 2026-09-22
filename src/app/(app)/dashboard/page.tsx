import Link from "next/link";
import type { Metadata } from "next";
import {
  BookCheck,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  FileText,
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
import {
  formatDaysOfWeek,
  formatHariTanggal,
  formatTanggalSingkat,
} from "@/lib/dates";
import { getDashboardStats } from "@/server/services/dashboard";
import { getPengajarAttendanceSessions } from "@/server/services/attendance-self";
import type { PengajarSession } from "@/server/services/attendance-self";
import { getPendingAppeals } from "@/server/services/appeals";
import { AdminAppealsCard } from "@/components/attendance/admin-appeals-card";
import { StudentAttendanceDialog } from "@/components/attendance/student-attendance-dialog";
import { OnboardingDialog } from "@/components/common/onboarding-dialog";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const user = await requireUser();

  if (user.role === "PENGAJAR") {
    const attendanceData = user.teamMemberId
      ? await getPengajarAttendanceSessions(user.teamMemberId)
      : null;

    return (
      <PengajarDashboard
        userId={user.id}
        userName={user.name}
        attendanceData={attendanceData}
      />
    );
  }

  const [stats, pendingAppeals] = await Promise.all([
    getDashboardStats(),
    getPendingAppeals(),
  ]);

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

      {pendingAppeals.length > 0 ? (
        <div className="mb-6">
          <AdminAppealsCard appeals={pendingAppeals} />
        </div>
      ) : null}

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

      {/* Keaktifan Pengajar Section */}
      <section className="mt-6" aria-label="Keaktifan Pengajar">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h2 className="font-heading text-lg tracking-tight">
              Keaktifan Pengajar
            </h2>
            <p className="text-muted-foreground text-xs">
              Pengajar paling aktif berdasarkan jumlah kegiatan mengajar yang telah diselesaikan.
            </p>
          </div>
          <ButtonLink href="/laporan/rekap" variant="ghost" size="sm">
            Lihat rekap kehadiran
          </ButtonLink>
        </div>

        {stats.topActiveMembers.length === 0 ? (
          <EmptyState
            icon={Users}
            title="Belum ada riwayat mengajar."
            description="Riwayat keaktifan pengajar akan otomatis muncul setelah kegiatan dicatat."
          />
        ) : (
          <div className="border-border rounded-lg border-2 shadow-[var(--shadow-brutal)] overflow-hidden bg-card">
            <ul className="divide-y-2 divide-border/15">
              {stats.topActiveMembers.map((member, index) => (
                <li
                  key={member.id}
                  className="p-3.5 flex items-center justify-between gap-3 hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="flex size-7 shrink-0 items-center justify-center rounded-full border-2 border-border font-heading text-xs font-bold bg-muted">
                      #{index + 1}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">
                        {member.fullName}
                      </p>
                      <p className="text-muted-foreground text-xs">
                        {member.status ?? "Pengajar"}
                        {member.lastActive
                          ? ` · Terakhir aktif: ${formatTanggalSingkat(member.lastActive)}`
                          : ""}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Badge
                      variant="outline"
                      className="bg-primary/10 text-primary font-bold border-primary/30"
                    >
                      {member.hadirCount} Sesi Hadir
                    </Badge>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>
    </>
  );
}

function PengajarDashboard({
  userId,
  userName,
  attendanceData,
}: {
  userId: string;
  userName: string;
  attendanceData: {
    todaySessions: PengajarSession[];
    upcomingSessions: PengajarSession[];
    recentHistory: Array<{
      id: string;
      date: Date;
      locationName: string;
      startTime: string;
      endTime: string;
      attendance: "HADIR" | "IZIN" | "SAKIT" | "ALPA";
      checkedInAt: Date | null;
      note: string | null;
    }>;
  } | null;
}) {
  const todayCount = attendanceData?.todaySessions.length ?? 0;
  const upcomingCount = attendanceData?.upcomingSessions.length ?? 0;
  const historyCount = attendanceData?.recentHistory.length ?? 0;
  const hasUnattendedToday = attendanceData?.todaySessions.some(
    (s) => s.currentAttendance === null,
  );

  return (
    <>
      <OnboardingDialog userId={userId} userName={userName} />

      <PageHeader
        title="Dashboard Pengajar"
        description={`Selamat datang, ${userName}!`}
        actions={
          <>
            <ButtonLink href="/absensi">
              <UserCheck className="size-4" />
              Absensi Mandiri
            </ButtonLink>
            <ButtonLink href="/panduan" variant="outline">
              <BookCheck className="size-4" />
              Panduan & SOP
            </ButtonLink>
          </>
        }
      />

      {hasUnattendedToday ? (
        <div className="mb-6 rounded-lg border-2 border-primary bg-primary/10 p-4 shadow-[var(--shadow-brutal-sm)]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-heading text-sm font-bold tracking-tight">
                Anda memiliki jadwal mengajar hari ini!
              </p>
              <p className="text-muted-foreground text-xs mt-0.5">
                Jangan lupa mencatat kehadiran Anda pada sesi kegiatan hari ini.
              </p>
            </div>
            <ButtonLink href="/absensi" size="sm">
              <CheckCircle2 className="size-3.5" />
              Catat Kehadiran Sekarang
            </ButtonLink>
          </div>
        </div>
      ) : null}

      <section
        aria-label="Statistik Pengajar"
        className="grid grid-cols-1 gap-3 sm:grid-cols-3"
      >
        <StatCard
          label="Sesi Hari Ini"
          value={todayCount}
          hint={
            hasUnattendedToday
              ? "Perlu absensi segera"
              : todayCount > 0
                ? "Sudah tercatat"
                : "Tidak ada jadwal hari ini"
          }
          icon={ClipboardList}
        />
        <StatCard
          label="Jadwal Mendatang"
          value={upcomingCount}
          hint="Sesi mengajar terencana"
          icon={CalendarDays}
        />
        <StatCard
          label="Riwayat Presensi"
          value={historyCount}
          hint="Sesi yang telah diikuti"
          icon={UserCheck}
        />
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {/* Sesi Hari Ini */}
        <section aria-label="Sesi Mengajar Hari Ini">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-heading text-lg tracking-tight">
              Sesi Hari Ini
            </h2>
            <ButtonLink href="/absensi" variant="ghost" size="sm">
              Ke halaman absensi
            </ButtonLink>
          </div>

          {!attendanceData || attendanceData.todaySessions.length === 0 ? (
            <EmptyState
              icon={CalendarDays}
              title="Tidak ada sesi hari ini."
              description="Anda tidak memiliki jadwal mengajar pada hari ini."
            />
          ) : (
            <ul className="divide-y-2 divide-border/15 border-border rounded-lg border-2 shadow-[var(--shadow-brutal)] overflow-hidden">
              {attendanceData.todaySessions.map((session) => (
                <li key={session.key} className="p-4 bg-card">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-medium text-sm">{session.title}</p>
                      <p className="text-muted-foreground text-xs mt-0.5 flex items-center gap-1">
                        <MapPin className="size-3" />
                        {session.locationName} · {session.startTime} - {session.endTime} WIB
                      </p>
                    </div>
                    {session.currentAttendance ? (
                      <Badge
                        variant={
                          session.currentAttendance === "HADIR"
                            ? "default"
                            : "secondary"
                        }
                        className={
                          session.currentAttendance === "HADIR"
                            ? "bg-green-600 text-white"
                            : "bg-amber-500/15 text-amber-700 dark:text-amber-300"
                        }
                      >
                        {session.currentAttendance}
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="border-dashed">
                        Belum Absen
                      </Badge>
                    )}
                  </div>

                  <div className="mt-3 pt-3 border-t flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <ButtonLink
                        href="/absensi"
                        size="sm"
                        variant="outline"
                        className="text-xs h-8 gap-1.5"
                      >
                        <UserCheck className="size-3.5" />
                        Presensi Mandiri
                      </ButtonLink>

                      <StudentAttendanceDialog
                        sessionKey={session.key}
                        sessionTitle={session.title}
                        locationName={session.locationName}
                        dateStr={session.dateStr}
                        studentAttendanceCount={session.studentAttendanceCount}
                      />
                    </div>

                    {session.activityId ? (
                      <ButtonLink
                        href={`/kegiatan/${session.activityId}`}
                        size="sm"
                        variant="outline"
                        className="text-xs h-8 gap-1.5"
                      >
                        <FileText className="size-3.5" />
                        Dokumentasi & Laporan
                      </ButtonLink>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Jadwal Mendatang & Kalender */}
        <section aria-label="Jadwal Mendatang">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-heading text-lg tracking-tight">
              Jadwal Mengajar Mendatang
            </h2>
            <ButtonLink href="/jadwal/kalender" variant="ghost" size="sm">
              Buka kalender
            </ButtonLink>
          </div>

          {!attendanceData || attendanceData.upcomingSessions.length === 0 ? (
            <EmptyState
              icon={CalendarDays}
              title="Belum ada jadwal mendatang."
              description="Jadwal kegiatan belajar mengajar mendatang akan muncul di sini."
            />
          ) : (
            <ul className="divide-y-2 divide-border/15 border-border rounded-lg border-2 shadow-[var(--shadow-brutal)] overflow-hidden">
              {attendanceData.upcomingSessions.slice(0, 5).map((session) => (
                <li key={session.key} className="p-3 bg-card">
                  <p className="truncate text-sm font-medium">
                    {session.title}
                  </p>
                  <p className="text-muted-foreground mt-0.5 text-xs">
                    {formatHariTanggal(session.date)} · {session.startTime} - {session.endTime} WIB
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
