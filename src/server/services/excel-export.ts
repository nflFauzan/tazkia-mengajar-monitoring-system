import ExcelJS from "exceljs";

import { formatTanggal } from "@/lib/dates";
import { prisma } from "@/lib/db/prisma";
import type { Prisma } from "@prisma/client";

import { ATTENDANCE_LABELS, tallyAttendance } from "./attendance";

/**
 * Excel export for the activity recap and both attendance recaps.
 *
 * All three sheets go into a single workbook rather than three downloads: the
 * three views describe the same filtered set of activities, and keeping them
 * together means the numbers in one sheet can be reconciled against another.
 *
 * The caller passes the same `where` clause the list page used, which is what
 * guarantees an export matches the filters on screen.
 */

const HEADER_FILL: ExcelJS.Fill = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "FFF1F5F9" },
};

function styleHeader(row: ExcelJS.Row) {
  row.font = { bold: true };
  row.fill = HEADER_FILL;
  row.alignment = { vertical: "middle" };
}

function autoWidth(sheet: ExcelJS.Worksheet, widths: number[]) {
  widths.forEach((width, index) => {
    sheet.getColumn(index + 1).width = width;
  });
}

export async function buildActivityWorkbook(
  where: Prisma.ActivityWhereInput,
): Promise<ExcelJS.Workbook> {
  const activities = await prisma.activity.findMany({
    where,
    orderBy: { date: "asc" },
    select: {
      id: true,
      date: true,
      startTime: true,
      endTime: true,
      partner: true,
      beneficiary: true,
      beneficiaryCount: true,
      aidType: true,
      status: true,
      notes: true,
      location: { select: { name: true, address: true } },
      report: { select: { generatedAt: true } },
      teamMembers: {
        orderBy: { orderIndex: "asc" },
        select: {
          attendance: true,
          note: true,
          teamMember: { select: { fullName: true, status: true } },
        },
      },
      students: {
        select: {
          attendance: true,
          note: true,
          student: {
            select: {
              fullName: true,
              studentGroup: { select: { name: true } },
            },
          },
        },
      },
      _count: { select: { documents: true } },
    },
  });

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Tazkia Mengajar Monitoring System";
  workbook.created = new Date();

  const statusLabels = {
    DRAFT: "Draft",
    COMPLETED: "Selesai",
    CANCELLED: "Dibatalkan",
  } as const;

  // --- Sheet 1: activity recap -------------------------------------------
  const recap = workbook.addWorksheet("Rekap Kegiatan");
  styleHeader(
    recap.addRow([
      "Tanggal",
      "Tempat",
      "Mitra",
      "Waktu",
      "Penerima Manfaat",
      "Jumlah",
      "Jenis Bantuan",
      "Tim Hadir",
      "Total Tim",
      "Dokumentasi",
      "Status",
      "Laporan",
      "Catatan",
    ]),
  );

  for (const activity of activities) {
    const tally = tallyAttendance(activity.teamMembers);

    recap.addRow([
      formatTanggal(activity.date),
      activity.location.name,
      activity.partner,
      `${activity.startTime}-${activity.endTime}`,
      activity.beneficiary,
      activity.beneficiaryCount,
      activity.aidType,
      tally.hadir,
      tally.total,
      activity._count.documents,
      statusLabels[activity.status],
      activity.report ? "Ada" : "Belum",
      activity.notes ?? "",
    ]);
  }

  autoWidth(recap, [16, 26, 14, 14, 30, 9, 30, 10, 10, 13, 12, 10, 30]);

  // --- Sheet 2: team attendance ------------------------------------------
  const team = workbook.addWorksheet("Absensi Tim");
  styleHeader(
    team.addRow([
      "Tanggal",
      "Tempat",
      "Nama",
      "Status Anggota",
      "Kehadiran",
      "Catatan",
    ]),
  );

  for (const activity of activities) {
    for (const entry of activity.teamMembers) {
      team.addRow([
        formatTanggal(activity.date),
        activity.location.name,
        entry.teamMember.fullName,
        entry.teamMember.status ?? "",
        ATTENDANCE_LABELS[entry.attendance],
        entry.note ?? "",
      ]);
    }
  }

  autoWidth(team, [16, 26, 28, 16, 13, 30]);

  // --- Sheet 3: student attendance ---------------------------------------
  const students = workbook.addWorksheet("Absensi Murid");
  styleHeader(
    students.addRow([
      "Tanggal",
      "Tempat",
      "Kelompok",
      "Nama Murid",
      "Kehadiran",
      "Catatan",
    ]),
  );

  for (const activity of activities) {
    for (const entry of activity.students) {
      students.addRow([
        formatTanggal(activity.date),
        activity.location.name,
        entry.student.studentGroup.name,
        entry.student.fullName,
        ATTENDANCE_LABELS[entry.attendance],
        entry.note ?? "",
      ]);
    }
  }

  autoWidth(students, [16, 26, 20, 28, 13, 30]);

  // A sheet with only a header row reads as a bug; saying so explicitly does not.
  if (students.rowCount === 1) {
    students.addRow([
      "Tidak ada absensi murid individual pada rentang ini.",
    ]);
  }
  if (team.rowCount === 1) {
    team.addRow(["Tidak ada absensi tim pada rentang ini."]);
  }
  if (recap.rowCount === 1) {
    recap.addRow(["Tidak ada kegiatan pada rentang ini."]);
  }

  return workbook;
}

/** A filename that sorts chronologically and says what it contains. */
export function buildExportFilename(prefix: string): string {
  const stamp = new Date().toISOString().slice(0, 10);
  return `${prefix}-${stamp}.xlsx`;
}
