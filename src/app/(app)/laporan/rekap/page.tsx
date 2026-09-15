import type { Metadata } from "next";
import { Download } from "lucide-react";

import { ActivityFilters } from "@/components/activities/activity-filters";
import { ButtonLink } from "@/components/common/button-link";
import { PageHeader, StatCard } from "@/components/common/page-shell";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import {
  buildActivityWhere,
  readActivityFilters,
} from "@/server/services/activity-query";

export const metadata: Metadata = { title: "Rekap" };

/**
 * Aggregated view of the same filtered activity set the history page shows,
 * broken down by location and by team member.
 *
 * Every figure comes from a SQL aggregate over the filtered set, so the recap,
 * the list and the Excel export can never disagree.
 */
export default async function RekapPage({
  searchParams,
}: PageProps<"/laporan/rekap">) {
  await requireUser();

  const params = await searchParams;
  const filters = readActivityFilters(params);
  const where = buildActivityWhere(filters);

  const [
    activityCount,
    beneficiarySum,
    teamAttendanceTotal,
    teamPresent,
    studentAttendanceTotal,
    studentPresent,
    documentationCount,
    locations,
    teamMembers,
  ] = await prisma.$transaction([
    prisma.activity.count({ where }),
    prisma.activity.aggregate({ where, _sum: { beneficiaryCount: true } }),
    prisma.activityTeamMember.count({ where: { activity: where } }),
    prisma.activityTeamMember.count({
      where: { activity: where, attendance: "HADIR" },
    }),
    prisma.activityStudent.count({ where: { activity: where } }),
    prisma.activityStudent.count({
      where: { activity: where, attendance: "HADIR" },
    }),
    prisma.documentation.count({ where: { activity: where } }),
    prisma.location.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.teamMember.findMany({
      orderBy: { fullName: "asc" },
      select: { id: true, fullName: true },
    }),
  ]);

  const locationNames = new Map(
    locations.map((location) => [location.id, location.name]),
  );

  // Both groupBy calls sit outside the transaction above: inside a
  // $transaction array Prisma widens each element's type and the `_count`
  // shape stops narrowing, which makes the results awkward to read.
  const byLocation = await prisma.activity.groupBy({
    by: ["locationId"],
    where,
    orderBy: { locationId: "asc" },
    _count: true,
    _sum: { beneficiaryCount: true },
  });

  // Per-member attendance breakdown. Done as one grouped query rather than a
  // query per member, which would be an N+1 over the whole team.
  const perMember = await prisma.activityTeamMember.groupBy({
    by: ["teamMemberId", "attendance"],
    where: { activity: where },
    orderBy: { teamMemberId: "asc" },
    _count: true,
  });

  const memberNames = new Map(
    teamMembers.map((member) => [member.id, member.fullName]),
  );

  const memberRows = new Map<
    string,
    { hadir: number; izin: number; sakit: number; alpa: number; total: number }
  >();

  for (const row of perMember) {
    const current = memberRows.get(row.teamMemberId) ?? {
      hadir: 0,
      izin: 0,
      sakit: 0,
      alpa: 0,
      total: 0,
    };
    const count = row._count;

    if (row.attendance === "HADIR") current.hadir += count;
    if (row.attendance === "IZIN") current.izin += count;
    if (row.attendance === "SAKIT") current.sakit += count;
    if (row.attendance === "ALPA") current.alpa += count;
    current.total += count;

    memberRows.set(row.teamMemberId, current);
  }

  const exportParams = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value) exportParams.set(key, value);
  }

  const percentage = (part: number, whole: number) =>
    whole === 0 ? "—" : `${Math.round((part / whole) * 100)}%`;

  return (
    <>
      <PageHeader
        title="Rekap"
        description="Ringkasan kegiatan dan kehadiran sesuai filter yang dipilih."
        actions={
          <ButtonLink
            href={`/api/export/kegiatan?${exportParams.toString()}`}
            variant="outline"
          >
            <Download className="size-4" />
            Export Excel
          </ButtonLink>
        }
      />

      <ActivityFilters
        locations={locations.map((location) => ({
          value: location.id,
          label: location.name,
        }))}
        teamMembers={teamMembers.map((member) => ({
          value: member.id,
          label: member.fullName,
        }))}
      />

      <section
        aria-label="Ringkasan"
        className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4"
      >
        <StatCard label="Kegiatan" value={activityCount} />
        <StatCard
          label="Penerima manfaat"
          value={beneficiarySum._sum.beneficiaryCount ?? 0}
        />
        <StatCard
          label="Kehadiran tim"
          value={percentage(teamPresent, teamAttendanceTotal)}
          hint={`${teamPresent} dari ${teamAttendanceTotal} tercatat`}
        />
        <StatCard
          label="Kehadiran murid"
          value={percentage(studentPresent, studentAttendanceTotal)}
          hint={
            studentAttendanceTotal === 0
              ? "Belum ada absensi murid"
              : `${studentPresent} dari ${studentAttendanceTotal} tercatat`
          }
        />
      </section>

      <section className="mb-6">
        <h2 className="font-heading mb-3 text-lg tracking-tight">Per Tempat</h2>
        <div className="border-border rounded-lg border-2 shadow-[var(--shadow-brutal)]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tempat</TableHead>
                <TableHead className="text-right">Kegiatan</TableHead>
                <TableHead className="text-right">Penerima manfaat</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {byLocation.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-muted-foreground">
                    Tidak ada kegiatan pada filter ini.
                  </TableCell>
                </TableRow>
              ) : (
                byLocation.map((row) => (
                  <TableRow key={row.locationId}>
                    <TableCell className="font-medium">
                      {locationNames.get(row.locationId) ?? "—"}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {row._count}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {row._sum.beneficiaryCount ?? 0}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </section>

      <section>
        <h2 className="font-heading mb-3 text-lg tracking-tight">Kehadiran Tim</h2>
        <div className="border-border rounded-lg border-2 shadow-[var(--shadow-brutal)]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nama</TableHead>
                <TableHead className="text-right">Hadir</TableHead>
                <TableHead className="text-right">Izin</TableHead>
                <TableHead className="text-right">Sakit</TableHead>
                <TableHead className="text-right">Alpa</TableHead>
                <TableHead className="text-right">Persentase</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {memberRows.size === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-muted-foreground">
                    Tidak ada absensi tim pada filter ini.
                  </TableCell>
                </TableRow>
              ) : (
                [...memberRows.entries()]
                  .sort(
                    (a, b) =>
                      (memberNames.get(a[0]) ?? "").localeCompare(
                        memberNames.get(b[0]) ?? "",
                      ),
                  )
                  .map(([memberId, row]) => (
                    <TableRow key={memberId}>
                      <TableCell className="font-medium">
                        {memberNames.get(memberId) ?? "—"}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {row.hadir}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {row.izin}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {row.sakit}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {row.alpa}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {percentage(row.hadir, row.total)}
                      </TableCell>
                    </TableRow>
                  ))
              )}
            </TableBody>
          </Table>
        </div>
      </section>

      <p className="text-muted-foreground mt-4 text-sm">
        Total dokumentasi pada filter ini: {documentationCount} berkas.
      </p>
    </>
  );
}
