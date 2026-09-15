import type { Metadata } from "next";
import { Layers } from "lucide-react";

import { ButtonLink } from "@/components/common/button-link";
import {
  ListSearch,
  PaginationControls,
} from "@/components/common/list-toolbar";
import { EmptyState, PageHeader } from "@/components/common/page-shell";
import {
  AddGroupButton,
  GroupRowActions,
} from "@/components/students/group-manager";
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

export const metadata: Metadata = { title: "Kelompok Murid" };

export default async function KelompokPage({
  searchParams,
}: PageProps<"/murid/kelompok">) {
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
          { name: { contains: search, mode: "insensitive" as const } },
          {
            location: {
              name: { contains: search, mode: "insensitive" as const },
            },
          },
        ],
      }
    : {};

  const [groups, total, locations] = await prisma.$transaction([
    prisma.studentGroup.findMany({
      where,
      orderBy: [{ isActive: "desc" }, { location: { name: "asc" } }, { name: "asc" }],
      skip,
      take,
      select: {
        id: true,
        name: true,
        description: true,
        isActive: true,
        locationId: true,
        location: { select: { name: true } },
        _count: { select: { students: true } },
      },
    }),
    prisma.studentGroup.count({ where }),
    prisma.location.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  const meta = buildPaginationMeta(total, page);
  const locationOptions = locations.map((location) => ({
    value: location.id,
    label: location.name,
  }));

  return (
    <>
      <PageHeader
        title="Kelompok Murid"
        description="Setiap tempat bisa punya kelompok sendiri sesuai kebutuhan."
        actions={
          <>
            <ButtonLink href="/murid" variant="outline">
              Lihat Murid
            </ButtonLink>
            <AddGroupButton locations={locationOptions} />
          </>
        }
      />

      <div className="mb-4">
        <ListSearch placeholder="Cari kelompok atau tempat..." />
      </div>

      {groups.length === 0 ? (
        <EmptyState
          icon={Layers}
          title={search ? "Kelompok tidak ditemukan." : "Belum ada kelompok."}
          description={
            search
              ? `Tidak ada kelompok yang cocok dengan "${search}".`
              : locationOptions.length === 0
                ? "Buat tempat terlebih dahulu, lalu tambahkan kelompok murid di dalamnya."
                : "Buat kelompok seperti Kelas Anak, Remaja, atau Tahsin."
          }
          action={
            search ? undefined : locationOptions.length === 0 ? (
              <ButtonLink href="/tempat">Buat tempat</ButtonLink>
            ) : (
              <AddGroupButton locations={locationOptions} />
            )
          }
        />
      ) : (
        <div className="border-border rounded-lg border-2 shadow-[var(--shadow-brutal)]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Kelompok</TableHead>
                <TableHead>Tempat</TableHead>
                <TableHead className="hidden lg:table-cell">Deskripsi</TableHead>
                <TableHead>Murid</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-20 text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {groups.map((group) => (
                <TableRow key={group.id}>
                  <TableCell className="font-medium">{group.name}</TableCell>
                  <TableCell>{group.location.name}</TableCell>
                  <TableCell className="text-muted-foreground hidden max-w-xs truncate lg:table-cell">
                    {group.description ?? "—"}
                  </TableCell>
                  <TableCell className="tabular-nums">
                    {group._count.students}
                  </TableCell>
                  <TableCell>
                    {group.isActive ? (
                      <Badge variant="outline">Aktif</Badge>
                    ) : (
                      <Badge variant="secondary">Arsip</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <GroupRowActions
                      group={{
                        id: group.id,
                        name: group.name,
                        description: group.description,
                        isActive: group.isActive,
                        locationId: group.locationId,
                      }}
                      locations={locationOptions}
                    />
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
