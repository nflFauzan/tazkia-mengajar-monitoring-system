import Link from "next/link";
import type { Metadata } from "next";
import { ChevronRight, Folder, Layers } from "lucide-react";

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
          { name: { contains: search, mode: "insensitive" as const } },
          {
            location: {
              name: { contains: search, mode: "insensitive" as const },
            },
          },
        ],
      }
    : {};

  const [groups, total, locations] = await Promise.all([
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
      {/* Breadcrumbs */}
      <nav aria-label="Breadcrumb" className="mb-3 flex items-center text-xs text-muted-foreground gap-1.5">
        <Link href="/murid" className="hover:text-foreground">
          Murid
        </Link>
        <ChevronRight className="size-3.5" />
        <span className="font-semibold text-foreground">Kelompok</span>
      </nav>

      <PageHeader
        title="Kelompok Murid"
        description="Daftar kelompok murid per tempat. Klik kelompok untuk melihat dan menilai murid di dalamnya."
        actions={
          isAdmin ? (
            <>
              <ButtonLink href="/murid" variant="outline">
                Folder Tempat
              </ButtonLink>
              <AddGroupButton locations={locationOptions} />
            </>
          ) : (
            <ButtonLink href="/murid" variant="outline">
              &larr; Folder Tempat
            </ButtonLink>
          )
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
                ? "Belum ada tempat yang terdaftar."
                : "Daftar kelompok murid belum tersedia."
          }
          action={
            !isAdmin || search
              ? undefined
              : locationOptions.length === 0
                ? <ButtonLink href="/tempat">Buat tempat</ButtonLink>
                : <AddGroupButton locations={locationOptions} />
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
                {isAdmin ? <TableHead className="w-20 text-right">Aksi</TableHead> : null}
              </TableRow>
            </TableHeader>
            <TableBody>
              {groups.map((group) => (
                <TableRow key={group.id}>
                  <TableCell className="font-medium">
                    <Link
                      href={`/murid?tempatId=${group.locationId}&kelompokId=${group.id}`}
                      className="hover:underline text-primary flex items-center gap-1.5"
                    >
                      <Folder className="size-3.5 shrink-0" />
                      {group.name}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Link
                      href={`/murid?tempatId=${group.locationId}`}
                      className="hover:underline text-muted-foreground hover:text-foreground"
                    >
                      {group.location.name}
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground hidden max-w-xs truncate lg:table-cell">
                    {group.description ?? "—"}
                  </TableCell>
                  <TableCell>
                    <ButtonLink
                      href={`/murid?tempatId=${group.locationId}&kelompokId=${group.id}`}
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs gap-1"
                    >
                      <span>{group._count.students} Murid</span>
                      <ChevronRight className="size-3" />
                    </ButtonLink>
                  </TableCell>
                  <TableCell>
                    {group.isActive ? (
                      <Badge variant="outline">Aktif</Badge>
                    ) : (
                      <Badge variant="secondary">Arsip</Badge>
                    )}
                  </TableCell>
                  {isAdmin ? (
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
