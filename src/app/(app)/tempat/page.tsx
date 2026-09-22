import type { Metadata } from "next";
import { MapPin } from "lucide-react";

import { ListSearch, PaginationControls } from "@/components/common/list-toolbar";
import { EmptyState, PageHeader } from "@/components/common/page-shell";
import {
  AddLocationButton,
  LocationRowActions,
} from "@/components/locations/location-manager";
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

export const metadata: Metadata = { title: "Tempat" };

export default async function TempatPage({ searchParams }: PageProps<"/tempat">) {
  const user = await requireUser();
  const isAdmin = user.role === "ADMIN";

  const params = await searchParams;
  const { page, skip, take } = parsePageParam(
    typeof params.page === "string" ? params.page : undefined,
  );
  const search = parseSearchParam(
    typeof params.q === "string" ? params.q : undefined,
  );

  // Filtering and counting both happen in SQL; the browser never receives more
  // than one page of rows.
  const where = search
    ? {
        OR: [
          { name: { contains: search, mode: "insensitive" as const } },
          { partner: { contains: search, mode: "insensitive" as const } },
          { category: { contains: search, mode: "insensitive" as const } },
        ],
      }
    : {};

  const [locations, total] = await Promise.all([
    prisma.location.findMany({
      where,
      orderBy: [{ isActive: "desc" }, { name: "asc" }],
      skip,
      take,
      select: {
        id: true,
        name: true,
        partner: true,
        address: true,
        category: true,
        description: true,
        isActive: true,
      },
    }),
    prisma.location.count({ where }),
  ]);

  const meta = buildPaginationMeta(total, page);

  return (
    <>
      <PageHeader
        title="Tempat"
        description="Lokasi kegiatan yang dipakai ulang untuk jadwal dan kegiatan."
        actions={isAdmin ? <AddLocationButton /> : null}
      />

      <div className="mb-4">
        <ListSearch placeholder="Cari nama, mitra, atau kategori..." />
      </div>

      {locations.length === 0 ? (
        <EmptyState
          icon={MapPin}
          title={search ? "Tempat tidak ditemukan." : "Belum ada tempat."}
          description={
            search
              ? `Tidak ada tempat yang cocok dengan "${search}".`
              : "Daftar tempat belum tersedia."
          }
          action={isAdmin && !search ? <AddLocationButton /> : undefined}
        />
      ) : (
        <div className="border-border rounded-lg border-2 shadow-[var(--shadow-brutal)]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nama</TableHead>
                <TableHead>Mitra</TableHead>
                <TableHead className="hidden md:table-cell">Kategori</TableHead>
                <TableHead className="hidden lg:table-cell">Alamat</TableHead>
                <TableHead>Status</TableHead>
                {isAdmin ? <TableHead className="w-20 text-right">Aksi</TableHead> : null}
              </TableRow>
            </TableHeader>
            <TableBody>
              {locations.map((location) => (
                <TableRow key={location.id}>
                  <TableCell className="font-medium">{location.name}</TableCell>
                  <TableCell>{location.partner}</TableCell>
                  <TableCell className="hidden md:table-cell">
                    {location.category}
                  </TableCell>
                  <TableCell className="text-muted-foreground hidden max-w-xs truncate lg:table-cell">
                    {location.address}
                  </TableCell>
                  <TableCell>
                    {location.isActive ? (
                      <Badge variant="outline">Aktif</Badge>
                    ) : (
                      <Badge variant="secondary">Arsip</Badge>
                    )}
                  </TableCell>
                  {isAdmin ? (
                    <TableCell className="text-right">
                      <LocationRowActions location={location} />
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
