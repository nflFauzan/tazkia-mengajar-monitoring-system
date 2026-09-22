import type { Metadata } from "next";
import { MessageCircle, Users } from "lucide-react";

import { buildWhatsAppLink } from "@/lib/whatsapp";

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
          { fullName: { contains: search, mode: "insensitive" as const } },
          { nickname: { contains: search, mode: "insensitive" as const } },
          { status: { contains: search, mode: "insensitive" as const } },
        ],
      }
    : {};

  const [members, total] = await Promise.all([
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
        description="Direktori pengajar, pembimbing, dan anggota tim Tazkia Mengajar."
        actions={isAdmin ? <AddTeamMemberButton /> : null}
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
              : "Daftar anggota tim belum tersedia."
          }
          action={isAdmin && !search ? <AddTeamMemberButton /> : undefined}
        />
      ) : (
        <div className="border-border rounded-lg border-2 shadow-[var(--shadow-brutal)]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nama</TableHead>
                <TableHead className="hidden sm:table-cell">Panggilan</TableHead>
                <TableHead className="hidden md:table-cell">Status</TableHead>
                <TableHead className="hidden lg:table-cell">Kontak</TableHead>
                <TableHead className="hidden lg:table-cell">Kegiatan</TableHead>
                <TableHead>Aktif</TableHead>
                {isAdmin ? <TableHead className="w-20 text-right">Aksi</TableHead> : null}
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
                    {member.phone ? (
                      <a
                        href={buildWhatsAppLink(member.phone, "")}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 font-mono text-xs text-emerald-700 hover:text-emerald-800 hover:underline dark:text-emerald-400 dark:hover:text-emerald-300"
                        title={`Hubungi ${member.fullName} via WhatsApp`}
                      >
                        <MessageCircle className="size-3" />
                        {member.phone}
                      </a>
                    ) : (
                      "—"
                    )}
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
                  {isAdmin ? (
                    <TableCell className="text-right">
                      <TeamMemberRowActions member={member} />
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
