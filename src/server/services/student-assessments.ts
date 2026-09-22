export interface StudentAssessmentItem {
  id: string;
  studentId: string;
  materialId: string | null;
  materialTitle: string | null;
  curriculumName: string | null;
  customTitle: string | null;
  status: string;
  notes: string | null;
  assessedById: string;
  assessedByName: string;
  activityId: string | null;
  createdAt: Date;
}

export async function saveStudentAssessment(params: {
  studentId: string;
  assessedById: string;
  materialId?: string | null;
  customTitle?: string | null;
  status: string;
  notes?: string | null;
  activityId?: string | null;
}): Promise<{ id: string }> {
  const status = params.status.trim();
  if (!status) {
    throw new Error("Status capaian wajib dipilih.");
  }

  if (!params.studentId?.trim()) {
    throw new Error("Data murid tidak ditemukan.");
  }

  const { prisma } = await import("@/lib/db/prisma");

  const student = await prisma.student.findUnique({
    where: { id: params.studentId },
    select: { id: true },
  });

  if (!student) {
    throw new Error("Data murid tidak ditemukan.");
  }

  const title = params.customTitle?.trim() || null;

  const assessment = await prisma.studentAssessment.create({
    data: {
      studentId: params.studentId,
      materialId: params.materialId || null,
      customTitle: title,
      status,
      notes: params.notes?.trim() || null,
      assessedById: params.assessedById,
      activityId: params.activityId || null,
    },
    select: { id: true },
  });

  return { id: assessment.id };
}

export async function getStudentAssessments(
  studentId: string,
): Promise<StudentAssessmentItem[]> {
  try {
    const { prisma } = await import("@/lib/db/prisma");

    if (!prisma || !("studentAssessment" in prisma) || !prisma.studentAssessment) {
      return [];
    }

    const rows = await prisma.studentAssessment.findMany({
      where: { studentId },
      orderBy: { createdAt: "desc" },
      include: {
        material: {
          select: {
            title: true,
            meetingLabel: true,
            period: {
              select: {
                curriculum: { select: { name: true } },
              },
            },
          },
        },
        assessedBy: { select: { name: true } },
      },
    });

    return rows.map((r) => ({
      id: r.id,
      studentId: r.studentId,
      materialId: r.materialId,
      materialTitle: r.material
        ? `${r.material.meetingLabel ? `${r.material.meetingLabel} — ` : ""}${r.material.title}`
        : null,
      curriculumName: r.material?.period.curriculum.name ?? null,
      customTitle: r.customTitle,
      status: r.status,
      notes: r.notes,
      assessedById: r.assessedById,
      assessedByName: r.assessedBy.name,
      activityId: r.activityId,
      createdAt: r.createdAt,
    }));
  } catch (error) {
    console.error("Failed to load student assessments:", error);
    return [];
  }
}

export async function deleteStudentAssessment(
  assessmentId: string,
  userId: string,
  isAdmin: boolean,
): Promise<{ id: string }> {
  const { prisma } = await import("@/lib/db/prisma");

  const assessment = await prisma.studentAssessment.findUnique({
    where: { id: assessmentId },
    select: { id: true, assessedById: true },
  });

  if (!assessment) {
    throw new Error("Data capaian tidak ditemukan.");
  }

  if (!isAdmin && assessment.assessedById !== userId) {
    throw new Error("Anda hanya dapat menghapus capaian yang Anda buat sendiri.");
  }

  await prisma.studentAssessment.delete({
    where: { id: assessmentId },
  });

  return { id: assessmentId };
}

export interface StudentAssessmentRecapItem {
  studentId: string;
  studentName: string;
  studentGender: string | null;
  locationId: string;
  locationName: string;
  groupId: string;
  groupName: string;
  totalAssessments: number;
  completedMaterialsCount: number;
  targetMaterialsCount: number;
  lastAssessment: {
    materialTitle: string;
    status: string;
    assessedByName: string;
    createdAt: Date;
  } | null;
  assessments: Array<{
    materialTitle: string;
    status: string;
    notes: string | null;
    createdAt: Date;
  }>;
}

export async function getStudentAssessmentsRecap(filters?: {
  locationId?: string;
  studentGroupId?: string;
}): Promise<{
  students: StudentAssessmentRecapItem[];
  totalStudents: number;
  totalCompletedAssessments: number;
  averageProgressPercent: number;
}> {
  const { prisma } = await import("@/lib/db/prisma");

  if (!prisma || !("studentAssessment" in prisma) || !prisma.studentAssessment) {
    return {
      students: [],
      totalStudents: 0,
      totalCompletedAssessments: 0,
      averageProgressPercent: 0,
    };
  }

  const whereStudent: Record<string, unknown> = { isActive: true };
  if (filters?.studentGroupId) {
    whereStudent.studentGroupId = filters.studentGroupId;
  } else if (filters?.locationId) {
    whereStudent.studentGroup = { locationId: filters.locationId };
  }

  const totalCurriculumMaterials = await prisma.curriculumMaterial.count();

  const students = await prisma.student.findMany({
    where: whereStudent,
    include: {
      studentGroup: {
        include: {
          location: { select: { id: true, name: true } },
        },
      },
      assessments: {
        orderBy: { createdAt: "desc" },
        include: {
          material: {
            select: {
              title: true,
              meetingLabel: true,
            },
          },
          assessedBy: { select: { name: true } },
        },
      },
    },
    orderBy: [
      { studentGroup: { location: { name: "asc" } } },
      { studentGroup: { name: "asc" } },
      { fullName: "asc" },
    ],
  });

  const recapItems: StudentAssessmentRecapItem[] = students.map((s) => {
    const completedCount = s.assessments.filter(
      (a) => a.status === "Tuntas" || a.status === "Lancar",
    ).length;

    const last = s.assessments[0] ?? null;
    const lastAssessment = last
      ? {
          materialTitle:
            last.material?.title ??
            last.customTitle ??
            "Materi Tanpa Judul",
          status: last.status,
          assessedByName: last.assessedBy.name,
          createdAt: last.createdAt,
        }
      : null;

    return {
      studentId: s.id,
      studentName: s.fullName,
      studentGender: s.gender,
      locationId: s.studentGroup.location.id,
      locationName: s.studentGroup.location.name,
      groupId: s.studentGroup.id,
      groupName: s.studentGroup.name,
      totalAssessments: s.assessments.length,
      completedMaterialsCount: completedCount,
      targetMaterialsCount: Math.max(totalCurriculumMaterials, 1),
      lastAssessment,
      assessments: s.assessments.map((a) => ({
        materialTitle:
          a.material?.title ?? a.customTitle ?? "Materi",
        status: a.status,
        notes: a.notes,
        createdAt: a.createdAt,
      })),
    };
  });

  let totalCompletedAll = 0;
  for (const item of recapItems) {
    totalCompletedAll += item.completedMaterialsCount;
  }

  const avgProgress =
    recapItems.length > 0 && totalCurriculumMaterials > 0
      ? Math.min(
          100,
          Math.round(
            (totalCompletedAll /
              (recapItems.length * totalCurriculumMaterials)) *
              100,
          ),
        )
      : 0;

  return {
    students: recapItems,
    totalStudents: recapItems.length,
    totalCompletedAssessments: totalCompletedAll,
    averageProgressPercent: avgProgress,
  };
}
