import type { Metadata } from "next";
import { CalendarDays } from "lucide-react";

import { ButtonLink } from "@/components/common/button-link";
import {
  ListSearch,
  PaginationControls,
} from "@/components/common/list-toolbar";
import { EmptyState, PageHeader } from "@/components/common/page-shell";
import {
  AddScheduleButton,
  ScheduleRowActions,
} from "@/components/schedules/schedule-manager";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { requireUser } from "@/lib/auth/session";
import {
  formatDaysOfWeek,
  formatTanggalSingkat,
  toDateInputValue,
} from "@/lib/dates";
import { prisma } from "@/lib/db/prisma";
import {
  buildPaginationMeta,
  parsePageParam,
  parseSearchParam,
} from "@/lib/pagination";

export const metadata: Metadata = { title: "Semua Jadwal" };

export default async function JadwalPage({
  searchParams,
}: PageProps<"/jadwal">) {
  const user = await requireUser();
  const isAdmin = user.role === "ADMIN";

  const params = await searchParams;
  const { page, skip, take } = parsePageParam(
    typeof params.page === "string" ? params.page : undefined,
  );
  const search = parseSearchParam(
    typeof params.q === "string" ? params.q : undefined,
  );

  const where = search
    ? {
        OR: [
          { title: { contains: search, mode: "insensitive" as const } },
          {
            location: {
              name: { contains: search, mode: "insensitive" as const },
            },
          },
        ],
      }
    : {};

  const [schedules, total, locations, teamMembers, studentGroups] =
    await Promise.all([
      prisma.schedule.findMany({
        where,
        orderBy: [{ isActive: "desc" }, { startDate: "desc" }],
        skip,
        take,
        select: {
          id: true,
          locationId: true,
          title: true,
          recurrence: true,
          daysOfWeek: true,
          startDate: true,
          endDate: true,
          startTime: true,
          endTime: true,
          notes: true,
          isActive: true,
          location: { select: { name: true } },
          teamMembers: { select: { teamMemberId: true } },
          studentGroups: { select: { studentGroupId: true } },
        },
      }),
      prisma.schedule.count({ where }),
      prisma.location.findMany({
        where: { isActive: true },
        orderBy: { name: "asc" },
        select: { id: true, name: true },
      }),
      prisma.teamMember.findMany({
        where: { isActive: true },
        orderBy: { fullName: "asc" },
        select: { id: true, fullName: true },
      }),
      prisma.studentGroup.findMany({
        where: { isActive: true },
        orderBy: { name: "asc" },
        select: {
          id: true,
          name: true,
          location: { select: { name: true } },
        },
      }),
    ]);

  const meta = buildPaginationMeta(total, page);

  const options = {
    locations: locations.map((item) => ({ value: item.id, label: item.name })),
    teamMembers: teamMembers.map((item) => ({
      value: item.id,
      label: item.fullName,
    })),
    studentGroups: studentGroups.map((item) => ({
      value: item.id,
      label: `${item.name} — ${item.location.name}`,
    })),
  };

  return (
    <>
      <PageHeader
        title="Semua Jadwal"
        description="Rencana kegiatan. Jadwal tidak otomatis menjadi kegiatan yang terlaksana."
        actions={
          isAdmin ? (
            <>
              <ButtonLink href="/jadwal/kalender" variant="outline">
                Kalender
              </ButtonLink>
              <AddScheduleButton options={options} />
            </>
          ) : (
            <ButtonLink href="/jadwal/kalender" variant="outline">
              Kalender
            </ButtonLink>
          )
        }
      />

      <div className="mb-4">
        <ListSearch placeholder="Cari nama jadwal atau tempat..." />
      </div>

      {schedules.length === 0 ? (
        <EmptyState
          icon={CalendarDays}
          title={search ? "Jadwal tidak ditemukan." : "Belum ada jadwal."}
          description={
            search
              ? `Tidak ada jadwal yang cocok dengan "${search}".`
              : "Daftar jadwal kegiatan belum tersedia."
          }
          action={isAdmin && !search ? <AddScheduleButton options={options} /> : undefined}
        />
      ) : (
        <div className="border-border rounded-lg border-2 shadow-[var(--shadow-brutal)]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Jadwal</TableHead>
                <TableHead>Tempat</TableHead>
                <TableHead>Hari</TableHead>
                <TableHead className="hidden sm:table-cell">Waktu</TableHead>
                <TableHead className="hidden lg:table-cell">Periode</TableHead>
                <TableHead>Status</TableHead>
                {isAdmin ? <TableHead className="w-20 text-right">Aksi</TableHead> : null}
              </TableRow>
            </TableHeader>
            <TableBody>
              {schedules.map((schedule) => (
                <TableRow key={schedule.id}>
                  <TableCell>
                    <div className="font-medium">{schedule.title}</div>
                    {schedule.teamMembers.length === 0 ? (
                      <span className="text-[11px] text-muted-foreground block">
                        Terbuka untuk semua relawan
                      </span>
                    ) : null}
                  </TableCell>
                  <TableCell>{schedule.location.name}</TableCell>
                  <TableCell>
                    {schedule.recurrence === "WEEKLY"
                      ? formatDaysOfWeek(schedule.daysOfWeek)
                      : "Sekali"}
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    {schedule.startTime}–{schedule.endTime}
                  </TableCell>
                  <TableCell className="text-muted-foreground hidden lg:table-cell">
                    {formatTanggalSingkat(schedule.startDate)}
                    {schedule.endDate
                      ? ` – ${formatTanggalSingkat(schedule.endDate)}`
                      : " – seterusnya"}
                  </TableCell>
                  <TableCell>
                    {schedule.isActive ? (
                      <Badge variant="outline">Aktif</Badge>
                    ) : (
                      <Badge variant="secondary">Nonaktif</Badge>
                    )}
                  </TableCell>
                  {isAdmin ? (
                    <TableCell className="text-right">
                      <ScheduleRowActions
                        options={options}
                        schedule={{
                          id: schedule.id,
                          locationId: schedule.locationId,
                          title: schedule.title,
                          recurrence: schedule.recurrence,
                          daysOfWeek: schedule.daysOfWeek,
                          startDate: toDateInputValue(schedule.startDate),
                          endDate: schedule.endDate
                            ? toDateInputValue(schedule.endDate)
                            : null,
                          startTime: schedule.startTime,
                          endTime: schedule.endTime,
                          notes: schedule.notes,
                          isActive: schedule.isActive,
                          teamMemberIds: schedule.teamMembers.map(
                            (entry) => entry.teamMemberId,
                          ),
                          studentGroupIds: schedule.studentGroups.map(
                            (entry) => entry.studentGroupId,
                          ),
                        }}
                      />
                    </TableCell>
                  ) : null}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <PaginationControls meta={meta} />
    </>
  );
}
