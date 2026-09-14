import type { Metadata } from "next";
import { Users } from "lucide-react";

import {
  ListSearch,
  PaginationControls,
} from "@/components/common/list-toolbar";
import { EmptyState, PageHeader } from "@/components/common/page-shell";
import {
  AddTeamMemberButton,
  TeamMemberRowActions,
} from "@/components/team/team-member-manager";
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
import { prisma } from "@/lib/db/prisma";
import {
  buildPaginationMeta,
  parsePageParam,
  parseSearchParam,
} from "@/lib/pagination";

export const metadata: Metadata = { title: "Tim" };

export default async function TimPage({ searchParams }: PageProps<"/tim">) {
  await requireUser();

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
          { fullName: { contains: search, mode: "insensitive" as const } },
          { nickname: { contains: search, mode: "insensitive" as const } },
          { status: { contains: search, mode: "insensitive" as const } },
        ],
      }
    : {};

  const [members, total] = await prisma.$transaction([
    prisma.teamMember.findMany({
      where,
      orderBy: [{ isActive: "desc" }, { fullName: "asc" }],
      skip,
      take,
      select: {
        id: true,
        fullName: true,
        nickname: true,
        status: true,
        phone: true,
        notes: true,
        isActive: true,
        _count: { select: { activityAttendances: true } },
      },
    }),
    prisma.teamMember.count({ where }),
  ]);

  const meta = buildPaginationMeta(total, page);

  return (
    <>
      <PageHeader
        title="Tim"
        description="Pengajar, pembimbing, dan anggota tim dicatat sebagai satu daftar."
        actions={<AddTeamMemberButton />}
      />

      <div className="mb-4">
        <ListSearch placeholder="Cari nama atau status..." />
      </div>

      {members.length === 0 ? (
        <EmptyState
          icon={Users}
          title={search ? "Anggota tidak ditemukan." : "Belum ada anggota tim."}
          description={
            search
              ? `Tidak ada anggota yang cocok dengan "${search}".`
              : "Tambahkan anggota tim agar bisa dipilih saat mencatat kegiatan."
          }
          action={search ? undefined : <AddTeamMemberButton />}
        />
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nama</TableHead>
                <TableHead className="hidden sm:table-cell">Panggilan</TableHead>
                <TableHead className="hidden md:table-cell">Status</TableHead>
                <TableHead className="hidden lg:table-cell">Kontak</TableHead>
                <TableHead className="hidden lg:table-cell">Kegiatan</TableHead>
                <TableHead>Aktif</TableHead>
                <TableHead className="w-20 text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.map((member) => (
                <TableRow key={member.id}>
                  <TableCell className="font-medium">
                    {member.fullName}
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    {member.nickname ?? "—"}
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    {member.status ?? "—"}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">
                    {member.phone ?? "—"}
                  </TableCell>
                  <TableCell className="hidden tabular-nums lg:table-cell">
                    {member._count.activityAttendances}
                  </TableCell>
                  <TableCell>
                    {member.isActive ? (
                      <Badge variant="outline">Aktif</Badge>
                    ) : (
                      <Badge variant="secondary">Arsip</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <TeamMemberRowActions member={member} />
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
