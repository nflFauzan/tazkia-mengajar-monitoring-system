import type { Metadata } from "next";
import { UsersRound } from "lucide-react";

import { ButtonLink } from "@/components/common/button-link";
import {
  ListSearch,
  PaginationControls,
} from "@/components/common/list-toolbar";
import { EmptyState, PageHeader } from "@/components/common/page-shell";
import {
  AddStudentButton,
  StudentRowActions,
} from "@/components/students/student-manager";
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
import { toDateInputValue } from "@/lib/dates";
import { prisma } from "@/lib/db/prisma";
import {
  buildPaginationMeta,
  parsePageParam,
  parseSearchParam,
} from "@/lib/pagination";

export const metadata: Metadata = { title: "Murid" };

const GENDER_LABELS = {
  LAKI_LAKI: "Laki-laki",
  PEREMPUAN: "Perempuan",
} as const;

export default async function MuridPage({ searchParams }: PageProps<"/murid">) {
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
          {
            studentGroup: {
              name: { contains: search, mode: "insensitive" as const },
            },
          },
        ],
      }
    : {};

  const [students, total, groups] = await prisma.$transaction([
    prisma.student.findMany({
      where,
      orderBy: [{ isActive: "desc" }, { fullName: "asc" }],
      skip,
      take,
      select: {
        id: true,
        fullName: true,
        gender: true,
        birthDate: true,
        notes: true,
        isActive: true,
        studentGroupId: true,
        studentGroup: {
          select: { name: true, location: { select: { name: true } } },
        },
      },
    }),
    prisma.student.count({ where }),
    // Only active groups are offered when assigning a student; archived ones
    // stay attached to existing rows but should not collect new members.
    prisma.studentGroup.findMany({
      where: { isActive: true },
      orderBy: [{ location: { name: "asc" } }, { name: "asc" }],
      select: { id: true, name: true, location: { select: { name: true } } },
    }),
  ]);

  const meta = buildPaginationMeta(total, page);
  const groupOptions = groups.map((group) => ({
    value: group.id,
    label: `${group.name} — ${group.location.name}`,
  }));

  return (
    <>
      <PageHeader
        title="Murid"
        description="Daftar murid per kelompok, dipakai ulang untuk absensi kegiatan."
        actions={
          <>
            <ButtonLink href="/murid/kelompok" variant="outline">
              Kelola Kelompok
            </ButtonLink>
            <AddStudentButton groups={groupOptions} />
          </>
        }
      />

      <div className="mb-4">
        <ListSearch placeholder="Cari nama murid atau kelompok..." />
      </div>

      {students.length === 0 ? (
        <EmptyState
          icon={UsersRound}
          title={search ? "Murid tidak ditemukan." : "Belum ada murid."}
          description={
            search
              ? `Tidak ada murid yang cocok dengan "${search}".`
              : groupOptions.length === 0
                ? "Buat kelompok murid terlebih dahulu, lalu tambahkan murid ke dalamnya."
                : "Tambahkan murid agar absensi bisa dicatat per individu."
          }
          action={
            search ? undefined : groupOptions.length === 0 ? (
              <ButtonLink href="/murid/kelompok">Buat kelompok</ButtonLink>
            ) : (
              <AddStudentButton groups={groupOptions} />
            )
          }
        />
      ) : (
        <div className="border-border rounded-lg border-2 shadow-[var(--shadow-brutal)]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nama</TableHead>
                <TableHead>Kelompok</TableHead>
                <TableHead className="hidden lg:table-cell">Tempat</TableHead>
                <TableHead className="hidden sm:table-cell">
                  Jenis kelamin
                </TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-20 text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {students.map((student) => (
                <TableRow key={student.id}>
                  <TableCell className="font-medium">
                    {student.fullName}
                  </TableCell>
                  <TableCell>{student.studentGroup.name}</TableCell>
                  <TableCell className="text-muted-foreground hidden lg:table-cell">
                    {student.studentGroup.location.name}
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    {student.gender ? GENDER_LABELS[student.gender] : "—"}
                  </TableCell>
                  <TableCell>
                    {student.isActive ? (
                      <Badge variant="outline">Aktif</Badge>
                    ) : (
                      <Badge variant="secondary">Arsip</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <StudentRowActions
                      groups={groupOptions}
                      student={{
                        id: student.id,
                        fullName: student.fullName,
                        gender: student.gender,
                        birthDate: student.birthDate
                          ? toDateInputValue(student.birthDate)
                          : null,
                        notes: student.notes,
                        isActive: student.isActive,
                        studentGroupId: student.studentGroupId,
                      }}
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
