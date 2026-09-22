import Link from "next/link";
import type { Metadata } from "next";
import {
  Award,
  ChevronRight,
  Download,
  Folder,
  FolderOpen,
  MapPin,
  Users,
  UsersRound,
} from "lucide-react";

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
import { StudentAssessmentDialog } from "@/components/students/student-assessment-dialog";
import { StudentAssessmentRecap } from "@/components/students/student-assessment-recap";
import { getStudentAssessmentsRecap } from "@/server/services/student-assessments";
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
  const user = await requireUser();
  const isAdmin = user.role === "ADMIN";

  const params = await searchParams;
  const { page, skip, take } = parsePageParam(
    typeof params.page === "string" ? params.page : undefined,
  );
  const search = parseSearchParam(
    typeof params.q === "string" ? params.q : undefined,
  );
  const tempatId =
    typeof params.tempatId === "string" && params.tempatId
      ? params.tempatId
      : undefined;
  const kelompokId =
    typeof params.kelompokId === "string" && params.kelompokId
      ? params.kelompokId
      : undefined;

  // 1. Fetch active curriculum materials for assessment dialog
  const materials = await prisma.curriculumMaterial.findMany({
    where: { isActive: true, period: { curriculum: { isActive: true } } },
    orderBy: [
      { period: { curriculum: { name: "asc" } } },
      { period: { orderIndex: "asc" } },
      { orderIndex: "asc" },
    ],
    select: {
      id: true,
      title: true,
      meetingLabel: true,
      period: {
        select: {
          curriculum: {
            select: { name: true },
          },
        },
      },
    },
  });

  const materialOptions = materials.map((m) => ({
    id: m.id,
    title: m.title,
    meetingLabel: m.meetingLabel,
    curriculumName: m.period.curriculum.name,
  }));

  // 2. Fetch all active groups for AddStudentButton
  const allActiveGroups = await prisma.studentGroup.findMany({
    where: { isActive: true },
    orderBy: [{ location: { name: "asc" } }, { name: "asc" }],
    select: { id: true, name: true, location: { select: { name: true } } },
  });

  const groupOptions = allActiveGroups.map((group) => ({
    value: group.id,
    label: `${group.name} — ${group.location.name}`,
  }));

  const tab = typeof params.tab === "string" ? params.tab : "daftar";

  // =========================================================================
  // VIEW MODE: REKAP CAPAIAN MURID
  // =========================================================================
  if (tab === "rekap") {
    const recap = await getStudentAssessmentsRecap({
      locationId: tempatId,
      studentGroupId: kelompokId,
    });

    const [selectedLocation, selectedGroup] = await Promise.all([
      tempatId
        ? prisma.location.findUnique({
            where: { id: tempatId },
            select: { name: true },
          })
        : null,
      kelompokId
        ? prisma.studentGroup.findUnique({
            where: { id: kelompokId },
            select: { name: true },
          })
        : null,
    ]);

    const locationName = selectedLocation?.name;
    const groupName = selectedGroup?.name;

    const exportParams = new URLSearchParams();
    if (tempatId) exportParams.set("locationId", tempatId);
    if (kelompokId) exportParams.set("studentGroupId", kelompokId);

    const folderParams = new URLSearchParams();
    if (tempatId) folderParams.set("tempatId", tempatId);
    if (kelompokId) folderParams.set("kelompokId", kelompokId);

    const rekapParams = new URLSearchParams({ tab: "rekap" });
    if (tempatId) rekapParams.set("tempatId", tempatId);
    if (kelompokId) rekapParams.set("kelompokId", kelompokId);

    return (
      <>
        {tempatId ? (
          <nav aria-label="Breadcrumb" className="mb-3 flex items-center text-xs text-muted-foreground gap-1.5">
            <Link href="/murid?tab=rekap" className="hover:text-foreground">
              Semua Tempat
            </Link>
            <ChevronRight className="size-3.5" />
            {kelompokId ? (
              <>
                <Link href={`/murid?tab=rekap&tempatId=${tempatId}`} className="hover:text-foreground">
                  {locationName}
                </Link>
                <ChevronRight className="size-3.5" />
                <span className="font-semibold text-foreground">{groupName}</span>
              </>
            ) : (
              <span className="font-semibold text-foreground">{locationName}</span>
            )}
          </nav>
        ) : null}

        <PageHeader
          title={
            groupName
              ? `Rekap Capaian — ${groupName}`
              : locationName
                ? `Rekap Capaian — ${locationName}`
                : "Rekap Capaian Murid"
          }
          description="Rangkuman ketuntasan materi kurikulum murid binaan."
          actions={
            isAdmin ? (
              <ButtonLink
                href={`/api/export/capaian?${exportParams.toString()}`}
                variant="outline"
                className="gap-1.5"
              >
                <Download className="size-4" />
                Export Excel Capaian
              </ButtonLink>
            ) : null
          }
        />

        {/* View Mode Toggle Buttons */}
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
          <div className="flex items-center gap-2">
            <ButtonLink
              href={`/murid${folderParams.toString() ? `?${folderParams.toString()}` : ""}`}
              variant="outline"
              size="sm"
              className="h-8 text-xs font-bold gap-1.5"
            >
              <Folder className="size-3.5" />
              Folder & Daftar Murid
            </ButtonLink>
            <ButtonLink
              href={`/murid?${rekapParams.toString()}`}
              variant="default"
              size="sm"
              className="h-8 text-xs font-bold gap-1.5"
            >
              <Award className="size-3.5" />
              Rekap Capaian Murid
            </ButtonLink>
          </div>
        </div>

        <StudentAssessmentRecap
          students={recap.students}
          totalStudents={recap.totalStudents}
          totalCompletedAssessments={recap.totalCompletedAssessments}
          averageProgressPercent={recap.averageProgressPercent}
          materials={materialOptions}
          isAdmin={isAdmin}
        />
      </>
    );
  }

  // =========================================================================
  // VIEW MODE A: SEARCH RESULTS ACROSS ALL STUDENTS
  // =========================================================================
  if (search) {
    const where = {
      OR: [
        { fullName: { contains: search, mode: "insensitive" as const } },
        {
          studentGroup: {
            name: { contains: search, mode: "insensitive" as const },
          },
        },
      ],
    };

    const [students, total] = await Promise.all([
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
            select: {
              name: true,
              locationId: true,
              location: { select: { name: true } },
            },
          },
        },
      }),
      prisma.student.count({ where }),
    ]);

    const meta = buildPaginationMeta(total, page);

    return (
      <>
        <PageHeader
          title="Pencarian Murid"
          description={`Menampilkan hasil pencarian untuk "${search}".`}
          actions={
            <ButtonLink href="/murid" variant="outline">
              Kembali ke Folder
            </ButtonLink>
          }
        />

        <div className="mb-4">
          <ListSearch placeholder="Cari nama murid atau kelompok..." />
        </div>

        {students.length === 0 ? (
          <EmptyState
            icon={UsersRound}
            title="Murid tidak ditemukan."
            description={`Tidak ada murid yang cocok dengan "${search}".`}
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
                  <TableHead className="text-right">Capaian</TableHead>
                  {isAdmin ? (
                    <TableHead className="w-20 text-right">Aksi</TableHead>
                  ) : null}
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
                      <StudentAssessmentDialog
                        studentId={student.id}
                        studentName={student.fullName}
                        groupName={student.studentGroup.name}
                        materials={materialOptions}
                      />
                    </TableCell>
                    {isAdmin ? (
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

  // =========================================================================
  // VIEW MODE C: LEVEL 3 - GROUP SELECTED (DAFTAR MURID DALAM KELOMPOK)
  // =========================================================================
  if (tempatId && kelompokId) {
    const [selectedGroup, selectedLocation, students, total] =
      await Promise.all([
        prisma.studentGroup.findUnique({
          where: { id: kelompokId },
          select: { id: true, name: true, locationId: true },
        }),
        prisma.location.findUnique({
          where: { id: tempatId },
          select: { id: true, name: true },
        }),
        prisma.student.findMany({
          where: { studentGroupId: kelompokId },
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
          },
        }),
        prisma.student.count({ where: { studentGroupId: kelompokId } }),
      ]);

    const locationName = selectedLocation?.name ?? "Tempat";
    const groupName = selectedGroup?.name ?? "Kelompok";
    const meta = buildPaginationMeta(total, page);

    return (
      <>
        {/* Breadcrumbs */}
        <nav aria-label="Breadcrumb" className="mb-3 flex items-center text-xs text-muted-foreground gap-1.5">
          <Link href="/murid" className="hover:text-foreground">
            Murid
          </Link>
          <ChevronRight className="size-3.5" />
          <Link href={`/murid?tempatId=${tempatId}`} className="hover:text-foreground">
            {locationName}
          </Link>
          <ChevronRight className="size-3.5" />
          <span className="font-semibold text-foreground">{groupName}</span>
        </nav>

        <PageHeader
          title={`Murid — ${groupName}`}
          description={`Daftar murid pada ${groupName} di ${locationName}.`}
          actions={
            <div className="flex items-center gap-2">
              <ButtonLink href={`/murid?tempatId=${tempatId}`} variant="outline">
                &larr; Kembali ke Kelompok
              </ButtonLink>
              {isAdmin ? <AddStudentButton groups={groupOptions} /> : null}
            </div>
          }
        />

        {/* View Mode Toggle Buttons */}
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
          <div className="flex items-center gap-2">
            <ButtonLink
              href={`/murid?tempatId=${tempatId}&kelompokId=${kelompokId}`}
              variant="default"
              size="sm"
              className="h-8 text-xs font-bold gap-1.5"
            >
              <Folder className="size-3.5" />
              Folder & Daftar Murid
            </ButtonLink>
            <ButtonLink
              href={`/murid?tab=rekap&tempatId=${tempatId}&kelompokId=${kelompokId}`}
              variant="outline"
              size="sm"
              className="h-8 text-xs font-bold gap-1.5"
            >
              <Award className="size-3.5" />
              Rekap Capaian Murid
            </ButtonLink>
          </div>

          {isAdmin ? (
            <ButtonLink
              href={`/api/export/capaian?locationId=${tempatId}&studentGroupId=${kelompokId}`}
              variant="outline"
              size="sm"
              className="h-8 text-xs gap-1.5"
            >
              <Download className="size-3.5" />
              Export Excel Capaian
            </ButtonLink>
          ) : null}
        </div>

        {students.length === 0 ? (
          <EmptyState
            icon={UsersRound}
            title="Belum ada murid di kelompok ini."
            description="Tambahkan murid ke dalam kelompok ini untuk mencatat kehadiran dan capaian kurikulum."
            action={isAdmin ? <AddStudentButton groups={groupOptions} /> : undefined}
          />
        ) : (
          <div className="border-border rounded-lg border-2 shadow-[var(--shadow-brutal)]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nama Murid</TableHead>
                  <TableHead className="hidden sm:table-cell">
                    Jenis kelamin
                  </TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Capaian & Penilaian</TableHead>
                  {isAdmin ? (
                    <TableHead className="w-20 text-right">Aksi</TableHead>
                  ) : null}
                </TableRow>
              </TableHeader>
              <TableBody>
                {students.map((student) => (
                  <TableRow key={student.id}>
                    <TableCell className="font-medium">
                      {student.fullName}
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
                      <StudentAssessmentDialog
                        studentId={student.id}
                        studentName={student.fullName}
                        groupName={groupName}
                        materials={materialOptions}
                      />
                    </TableCell>
                    {isAdmin ? (
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

  // =========================================================================
  // VIEW MODE B: LEVEL 2 - TEMPAT SELECTED (DAFTAR KELOMPOK DALAM TEMPAT)
  // =========================================================================
  if (tempatId) {
    const [selectedLocation, groups] = await Promise.all([
      prisma.location.findUnique({
        where: { id: tempatId },
        select: { id: true, name: true, address: true },
      }),
      prisma.studentGroup.findMany({
        where: { locationId: tempatId },
        orderBy: [{ isActive: "desc" }, { name: "asc" }],
        select: {
          id: true,
          name: true,
          isActive: true,
          _count: {
            select: { students: true },
          },
        },
      }),
    ]);

    const locationName = selectedLocation?.name ?? "Tempat";

    return (
      <>
        {/* Breadcrumbs */}
        <nav aria-label="Breadcrumb" className="mb-3 flex items-center text-xs text-muted-foreground gap-1.5">
          <Link href="/murid" className="hover:text-foreground">
            Murid
          </Link>
          <ChevronRight className="size-3.5" />
          <span className="font-semibold text-foreground">{locationName}</span>
        </nav>

        <PageHeader
          title={`Kelompok Murid — ${locationName}`}
          description={
            selectedLocation?.address
              ? `${selectedLocation.address} · Pilih kelompok untuk melihat dan menilai murid.`
              : "Pilih kelompok belajar untuk melihat dan menilai murid."
          }
          actions={
            <div className="flex items-center gap-2">
              <ButtonLink href="/murid" variant="outline">
                &larr; Semua Tempat
              </ButtonLink>
              {isAdmin ? (
                <>
                  <ButtonLink href="/murid/kelompok" variant="outline">
                    Kelola Kelompok
                  </ButtonLink>
                  <AddStudentButton groups={groupOptions} />
                </>
              ) : null}
            </div>
          }
        />

        {/* View Mode Toggle Buttons */}
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
          <div className="flex items-center gap-2">
            <ButtonLink
              href={`/murid?tempatId=${tempatId}`}
              variant="default"
              size="sm"
              className="h-8 text-xs font-bold gap-1.5"
            >
              <Folder className="size-3.5" />
              Folder & Daftar Murid
            </ButtonLink>
            <ButtonLink
              href={`/murid?tab=rekap&tempatId=${tempatId}`}
              variant="outline"
              size="sm"
              className="h-8 text-xs font-bold gap-1.5"
            >
              <Award className="size-3.5" />
              Rekap Capaian Murid
            </ButtonLink>
          </div>

          {isAdmin ? (
            <ButtonLink
              href={`/api/export/capaian?locationId=${tempatId}`}
              variant="outline"
              size="sm"
              className="h-8 text-xs gap-1.5"
            >
              <Download className="size-3.5" />
              Export Excel Capaian
            </ButtonLink>
          ) : null}
        </div>

        {groups.length === 0 ? (
          <EmptyState
            icon={Folder}
            title="Belum ada kelompok di tempat ini."
            description="Buat kelompok terlebih dahulu sebelum menambahkan murid ke tempat ini."
            action={
              isAdmin ? (
                <ButtonLink href="/murid/kelompok">Buat Kelompok</ButtonLink>
              ) : undefined
            }
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {groups.map((group) => (
              <div
                key={group.id}
                className="bg-card border-border rounded-lg border-2 p-5 shadow-[var(--shadow-brutal)] flex flex-col justify-between hover:border-primary transition-colors"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="p-2 rounded-md bg-primary/10 text-primary border border-primary/20">
                      <FolderOpen className="size-5" />
                    </div>
                    {group.isActive ? (
                      <Badge variant="outline" className="text-xs">
                        Aktif
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="text-xs">
                        Arsip
                      </Badge>
                    )}
                  </div>

                  <h3 className="font-heading text-base tracking-tight mt-3">
                    {group.name}
                  </h3>
                  <p className="text-muted-foreground text-xs mt-1 flex items-center gap-1.5">
                    <Users className="size-3.5" />
                    {group._count.students} Murid Terdaftar
                  </p>
                </div>

                <div className="mt-5 pt-3 border-t">
                  <ButtonLink
                    href={`/murid?tempatId=${tempatId}&kelompokId=${group.id}`}
                    size="sm"
                    className="w-full justify-between"
                  >
                    <span>Buka Murid</span>
                    <ChevronRight className="size-4" />
                  </ButtonLink>
                </div>
              </div>
            ))}
          </div>
        )}
      </>
    );
  }

  // =========================================================================
  // VIEW MODE A: LEVEL 1 - DEFAULT (DAFTAR TEMPAT SEBAGAI FOLDER UTAMA)
  // =========================================================================
  const locations = await prisma.location.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      address: true,
      studentGroups: {
        select: {
          id: true,
          _count: {
            select: { students: true },
          },
        },
      },
    },
  });

  return (
    <>
      <PageHeader
        title="Murid"
        description="Jelajahi data murid per tempat dan kelompok belajar."
        actions={
          isAdmin ? (
            <>
              <ButtonLink href="/murid/kelompok" variant="outline">
                Kelola Kelompok
              </ButtonLink>
              <AddStudentButton groups={groupOptions} />
            </>
          ) : undefined
        }
      />

      {/* View Mode Toggle Buttons */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <div className="flex items-center gap-2">
          <ButtonLink
            href="/murid"
            variant="default"
            size="sm"
            className="h-8 text-xs font-bold gap-1.5"
          >
            <Folder className="size-3.5" />
            Folder & Daftar Murid
          </ButtonLink>
          <ButtonLink
            href="/murid?tab=rekap"
            variant="outline"
            size="sm"
            className="h-8 text-xs font-bold gap-1.5"
          >
            <Award className="size-3.5" />
            Rekap Capaian Murid
          </ButtonLink>
        </div>

        {isAdmin ? (
          <ButtonLink
            href="/api/export/capaian"
            variant="outline"
            size="sm"
            className="h-8 text-xs gap-1.5"
          >
            <Download className="size-3.5" />
            Export Excel Capaian
          </ButtonLink>
        ) : null}
      </div>

      <div className="mb-5">
        <ListSearch placeholder="Cari nama murid secara langsung di semua tempat..." />
      </div>

      {locations.length === 0 ? (
        <EmptyState
          icon={MapPin}
          title="Belum ada tempat mengajar aktif."
          description="Tambahkan tempat mengajar terlebih dahulu di menu Tempat."
          action={
            isAdmin ? (
              <ButtonLink href="/tempat/baru">Tambah Tempat</ButtonLink>
            ) : undefined
          }
        />
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-heading text-lg tracking-tight flex items-center gap-2">
              <Folder className="size-5 text-primary" />
              Folder Tempat Mengajar
            </h2>
            <span className="text-xs text-muted-foreground">
              {locations.length} Lokasi Terdaftar
            </span>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {locations.map((loc) => {
              const groupCount = loc.studentGroups.length;
              const studentCount = loc.studentGroups.reduce(
                (sum, g) => sum + g._count.students,
                0,
              );

              return (
                <div
                  key={loc.id}
                  className="bg-card border-border rounded-lg border-2 p-5 shadow-[var(--shadow-brutal)] flex flex-col justify-between hover:border-primary transition-colors"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div className="p-2.5 rounded-lg bg-primary/10 text-primary border border-primary/20">
                        <Folder className="size-6" />
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {groupCount} Kelompok
                      </Badge>
                    </div>

                    <h3 className="font-heading text-base tracking-tight mt-3">
                      {loc.name}
                    </h3>
                    {loc.address ? (
                      <p className="text-muted-foreground text-xs mt-1 line-clamp-2">
                        {loc.address}
                      </p>
                    ) : null}

                    <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                      <Users className="size-3.5" />
                      <span>{studentCount} Total Murid</span>
                    </div>
                  </div>

                  <div className="mt-5 pt-3 border-t">
                    <ButtonLink
                      href={`/murid?tempatId=${loc.id}`}
                      size="sm"
                      className="w-full justify-between"
                    >
                      <span>Buka Folder Tempat</span>
                      <ChevronRight className="size-4" />
                    </ButtonLink>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
}
