import type { AttendanceStatus } from "@prisma/client";

export interface AttendanceAppealItem {
  id: string;
  activityId: string;
  teamMemberId: string;
  teamMemberName: string;
  locationName: string;
  activityDate: Date;
  proposedAttendance: AttendanceStatus;
  reason: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  adminNote: string | null;
  createdAt: Date;
  reviewedAt: Date | null;
  reviewerName: string | null;
}

export async function submitAttendanceAppeal(params: {
  activityId: string;
  teamMemberId: string;
  proposedAttendance: AttendanceStatus;
  reason: string;
}): Promise<{ id: string }> {
  const trimmedReason = params.reason.trim();
  if (!trimmedReason) {
    throw new Error("Alasan banding wajib diisi.");
  }

  const { prisma } = await import("@/lib/db/prisma");

  const activity = await prisma.activity.findUnique({
    where: { id: params.activityId },
    select: { id: true, date: true },
  });

  if (!activity) {
    throw new Error("Kegiatan tidak ditemukan.");
  }

  // Check existing appeal
  const existing = await prisma.attendanceAppeal.findUnique({
    where: {
      activityId_teamMemberId: {
        activityId: params.activityId,
        teamMemberId: params.teamMemberId,
      },
    },
  });

  if (existing && existing.status === "PENDING") {
    throw new Error("Pengajuan banding untuk kegiatan ini masih menunggu peninjauan Admin.");
  }

  const appeal = await prisma.attendanceAppeal.upsert({
    where: {
      activityId_teamMemberId: {
        activityId: params.activityId,
        teamMemberId: params.teamMemberId,
      },
    },
    create: {
      activityId: params.activityId,
      teamMemberId: params.teamMemberId,
      proposedAttendance: params.proposedAttendance,
      reason: trimmedReason,
      status: "PENDING",
    },
    update: {
      proposedAttendance: params.proposedAttendance,
      reason: trimmedReason,
      status: "PENDING",
      adminNote: null,
      reviewedById: null,
      reviewedAt: null,
    },
    select: { id: true },
  });

  return { id: appeal.id };
}

export async function reviewAttendanceAppeal(params: {
  appealId: string;
  reviewerId: string;
  approved: boolean;
  adminNote?: string;
}): Promise<{ id: string }> {
  const { prisma } = await import("@/lib/db/prisma");

  const appeal = await prisma.attendanceAppeal.findUnique({
    where: { id: params.appealId },
    include: {
      activity: true,
      teamMember: true,
    },
  });

  if (!appeal) {
    throw new Error("Pengajuan banding tidak ditemukan.");
  }

  const now = new Date();
  const trimmedAdminNote = params.adminNote?.trim() || null;

  if (params.approved) {
    await prisma.$transaction([
      prisma.attendanceAppeal.update({
        where: { id: appeal.id },
        data: {
          status: "APPROVED",
          adminNote: trimmedAdminNote,
          reviewedById: params.reviewerId,
          reviewedAt: now,
        },
      }),
      prisma.activityTeamMember.upsert({
        where: {
          activityId_teamMemberId: {
            activityId: appeal.activityId,
            teamMemberId: appeal.teamMemberId,
          },
        },
        create: {
          activityId: appeal.activityId,
          teamMemberId: appeal.teamMemberId,
          attendance: appeal.proposedAttendance,
          note: trimmedAdminNote
            ? `Banding disetujui: ${appeal.reason} (Catatan Admin: ${trimmedAdminNote})`
            : `Banding disetujui: ${appeal.reason}`,
          checkedInAt: appeal.proposedAttendance === "HADIR" ? now : null,
        },
        update: {
          attendance: appeal.proposedAttendance,
          note: trimmedAdminNote
            ? `Banding disetujui: ${appeal.reason} (Catatan Admin: ${trimmedAdminNote})`
            : `Banding disetujui: ${appeal.reason}`,
          checkedInAt: appeal.proposedAttendance === "HADIR" ? now : null,
        },
      }),
    ]);
  } else {
    await prisma.attendanceAppeal.update({
      where: { id: appeal.id },
      data: {
        status: "REJECTED",
        adminNote: trimmedAdminNote,
        reviewedById: params.reviewerId,
        reviewedAt: now,
      },
    });
  }

  return { id: appeal.id };
}

export async function getPendingAppeals(): Promise<AttendanceAppealItem[]> {
  const { prisma } = await import("@/lib/db/prisma");

  if (!prisma || !("attendanceAppeal" in prisma) || !prisma.attendanceAppeal) {
    return [];
  }

  const rows = await prisma.attendanceAppeal.findMany({
    where: { status: "PENDING" },
    orderBy: { createdAt: "desc" },
    include: {
      teamMember: { select: { fullName: true } },
      activity: {
        select: {
          date: true,
          location: { select: { name: true } },
        },
      },
      reviewedBy: { select: { name: true } },
    },
  });

  return rows.map((r) => ({
    id: r.id,
    activityId: r.activityId,
    teamMemberId: r.teamMemberId,
    teamMemberName: r.teamMember.fullName,
    locationName: r.activity.location.name,
    activityDate: r.activity.date,
    proposedAttendance: r.proposedAttendance,
    reason: r.reason,
    status: r.status,
    adminNote: r.adminNote,
    createdAt: r.createdAt,
    reviewedAt: r.reviewedAt,
    reviewerName: r.reviewedBy?.name ?? null,
  }));
}
