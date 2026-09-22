import Link from "next/link";
import type { Metadata } from "next";
import { FileText } from "lucide-react";

import { ButtonLink } from "@/components/common/button-link";
import {
  ListSearch,
  PaginationControls,
} from "@/components/common/list-toolbar";
import { EmptyState, PageHeader } from "@/components/common/page-shell";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { requireAdmin } from "@/lib/auth/session";
import { formatTanggalSingkat } from "@/lib/dates";
import { prisma } from "@/lib/db/prisma";
import {
  buildPaginationMeta,
  parsePageParam,
  parseSearchParam,
} from "@/lib/pagination";

export const metadata: Metadata = { title: "Semua Laporan" };

export default async function LaporanPage({
  searchParams,
}: PageProps<"/laporan">) {
  await requireAdmin();

  const params = await searchParams;
  const { page, skip, take } = parsePageParam(
    typeof params.page === "string" ? params.page : undefined,
  );
  const search = parseSearchParam(
    typeof params.q === "string" ? params.q : undefined,
  );

  const where = search
    ? {
        activity: {
          OR: [
            { beneficiary: { contains: search, mode: "insensitive" as const } },
            {
              location: {
                name: { contains: search, mode: "insensitive" as const },
              },
            },
          ],
        },
      }
    : {};

  const [reports, total] = await Promise.all([
    prisma.report.findMany({
      where,
      orderBy: { generatedAt: "desc" },
      skip,
      take,
      select: {
        id: true,
        generatedAt: true,
        narrativeEdited: true,
        activity: {
          select: {
            id: true,
            date: true,
            status: true,
            beneficiaryCount: true,
            location: { select: { name: true } },
          },
        },
      },
    }),
    prisma.report.count({ where }),
  ]);

  const meta = buildPaginationMeta(total, page);

  return (
    <>
      <PageHeader
        title="Semua Laporan"
        description="Laporan yang sudah dihasilkan dari kegiatan."
        actions={<ButtonLink href="/laporan/rekap" variant="outline">Rekap</ButtonLink>}
      />

      <div className="mb-4">
        <ListSearch placeholder="Cari tempat atau penerima manfaat..." />
      </div>

      {reports.length === 0 ? (
        <EmptyState
          icon={FileText}
          title={search ? "Laporan tidak ditemukan." : "Belum ada laporan."}
          description={
            search
              ? `Tidak ada laporan yang cocok dengan "${search}".`
              : "Laporan muncul di sini setelah dibuat dari halaman kegiatan."
          }
          action={
            search ? undefined : (
              <ButtonLink href="/kegiatan">Lihat kegiatan</ButtonLink>
            )
          }
        />
      ) : (
        <div className="border-border rounded-lg border-2 shadow-[var(--shadow-brutal)]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tanggal kegiatan</TableHead>
                <TableHead>Tempat</TableHead>
                <TableHead className="text-right">Penerima manfaat</TableHead>
                <TableHead className="hidden sm:table-cell">Narasi</TableHead>
                <TableHead className="hidden md:table-cell">Dibuat</TableHead>
                <TableHead className="w-24 text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reports.map((report) => (
                <TableRow key={report.id}>
                  <TableCell className="font-medium">
                    {formatTanggalSingkat(report.activity.date)}
                  </TableCell>
                  <TableCell>{report.activity.location.name}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {report.activity.beneficiaryCount}
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    {report.narrativeEdited ? (
                      <Badge variant="secondary">Diedit</Badge>
                    ) : (
                      <Badge variant="outline">Otomatis</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground hidden md:table-cell">
                    {formatTanggalSingkat(report.generatedAt)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Link
                      href={`/kegiatan/${report.activity.id}?step=laporan`}
                      className="text-sm font-medium hover:underline"
                    >
                      Buka
                    </Link>
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
