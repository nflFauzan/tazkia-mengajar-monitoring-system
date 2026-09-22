import Link from "next/link";
import type { Metadata } from "next";
import { ClipboardList, Download, Plus } from "lucide-react";

import { ActivityFilters } from "@/components/activities/activity-filters";
import { ActivityStatusBadge } from "@/components/activities/activity-status-badge";
import { ButtonLink } from "@/components/common/button-link";
import {
  ListSearch,
  PaginationControls,
} from "@/components/common/list-toolbar";
import { EmptyState, PageHeader } from "@/components/common/page-shell";
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
import { formatTanggalSingkat } from "@/lib/dates";
import { prisma } from "@/lib/db/prisma";
import {
  buildPaginationMeta,
  parsePageParam,
} from "@/lib/pagination";
import {
  buildActivityWhere,
  readActivityFilters,
} from "@/server/services/activity-query";

export const metadata: Metadata = { title: "Semua Kegiatan" };

export default async function KegiatanPage({
  searchParams,
}: PageProps<"/kegiatan">) {
  const user = await requireUser();
  const isAdmin = user.role === "ADMIN";

  const params = await searchParams;
  const { page, skip, take } = parsePageParam(
    typeof params.page === "string" ? params.page : undefined,
  );

  const filters = readActivityFilters(params);
  const where = buildActivityWhere(filters);

  const [activities, total, locations, teamMembers] = await Promise.all([
      prisma.activity.findMany({
        where,
        orderBy: { date: "desc" },
        skip,
        take,
        select: {
          id: true,
          date: true,
          startTime: true,
          endTime: true,
          beneficiary: true,
          beneficiaryCount: true,
          status: true,
          location: { select: { name: true } },
          report: { select: { id: true } },
          _count: { select: { teamMembers: true, documents: true } },
        },
      }),
      prisma.activity.count({ where }),
      prisma.location.findMany({
        orderBy: { name: "asc" },
        select: { id: true, name: true },
      }),
      prisma.teamMember.findMany({
        orderBy: { fullName: "asc" },
        select: { id: true, fullName: true },
      }),
    ],
  );

  const meta = buildPaginationMeta(total, page);

  // The export link carries the current filters so the spreadsheet matches what
  // is on screen.
  const exportParams = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value) exportParams.set(key, value);
  }

  return (
    <>
      <PageHeader
        title="Semua Kegiatan"
        description="Histori kegiatan beserta status laporannya."
        actions={
          <>
            <ButtonLink
              href={`/api/export/kegiatan?${exportParams.toString()}`}
              variant="outline"
            >
              <Download className="size-4" />
              Export Excel
            </ButtonLink>
            {isAdmin ? (
              <ButtonLink href="/kegiatan/baru">
                <Plus className="size-4" />
                Tambah Kegiatan
              </ButtonLink>
            ) : null}
          </>
        }
      />

      <div className="mb-4">
        <ListSearch placeholder="Cari penerima manfaat, jenis bantuan, tempat..." />
      </div>

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

      {activities.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="Belum ada kegiatan."
          description="Catat kegiatan pertama untuk mulai membangun histori, rekap, dan laporan."
          action={<ButtonLink href="/kegiatan/baru">Buat kegiatan</ButtonLink>}
        />
      ) : (
        <div className="border-border rounded-lg border-2 shadow-[var(--shadow-brutal)]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tanggal</TableHead>
                <TableHead>Tempat</TableHead>
                <TableHead className="hidden lg:table-cell">
                  Penerima manfaat
                </TableHead>
                <TableHead className="text-right">Jumlah</TableHead>
                <TableHead className="hidden text-right sm:table-cell">
                  Tim
                </TableHead>
                <TableHead className="hidden text-right md:table-cell">
                  Dokumentasi
                </TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {activities.map((activity) => (
                <TableRow key={activity.id}>
                  <TableCell>
                    <Link
                      href={`/kegiatan/${activity.id}`}
                      className="font-medium hover:underline"
                    >
                      {formatTanggalSingkat(activity.date)}
                    </Link>
                    <span className="text-muted-foreground block text-xs">
                      {activity.startTime}–{activity.endTime}
                    </span>
                  </TableCell>
                  <TableCell>{activity.location.name}</TableCell>
                  <TableCell className="text-muted-foreground hidden max-w-xs truncate lg:table-cell">
                    {activity.beneficiary}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {activity.beneficiaryCount}
                  </TableCell>
                  <TableCell className="hidden text-right tabular-nums sm:table-cell">
                    {activity._count.teamMembers}
                  </TableCell>
                  <TableCell className="hidden text-right tabular-nums md:table-cell">
                    {activity._count.documents}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      {activity.report ? (
                        <Badge variant="outline">Laporan</Badge>
                      ) : null}
                      <ActivityStatusBadge status={activity.status} />
                    </div>
                  </TableCell>
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
