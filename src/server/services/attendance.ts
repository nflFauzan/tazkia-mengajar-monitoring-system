import type { AttendanceStatus } from "@prisma/client";

/**
 * Attendance tallies and the consistency check the PRD asks for.
 *
 * Kept as pure functions so the rule is unit-testable and identical everywhere
 * it is shown — the wizard, the activity detail page and the recap all use it.
 */

export interface AttendanceTally {
  total: number;
  hadir: number;
  izin: number;
  sakit: number;
  alpa: number;
}

export function tallyAttendance(
  entries: Array<{ attendance: AttendanceStatus }>,
): AttendanceTally {
  const tally: AttendanceTally = {
    total: entries.length,
    hadir: 0,
    izin: 0,
    sakit: 0,
    alpa: 0,
  };

  for (const entry of entries) {
    switch (entry.attendance) {
      case "HADIR":
        tally.hadir += 1;
        break;
      case "IZIN":
        tally.izin += 1;
        break;
      case "SAKIT":
        tally.sakit += 1;
        break;
      case "ALPA":
        tally.alpa += 1;
        break;
    }
  }

  return tally;
}

/**
 * Compares the recorded beneficiary count against individual student rows.
 *
 * Individual students are optional (PRD section 12): an activity may carry only
 * `beneficiaryCount`. But when both exist and disagree, the system must say so
 * rather than silently publish a misleading total (CLAUDE.md section 11).
 *
 * This deliberately returns a warning rather than blocking. The count is the
 * authoritative figure and there are legitimate reasons for it to exceed the
 * named students — walk-ins who are not enrolled, siblings attending with a
 * student — so the admin decides, with the discrepancy in front of them.
 */
export function checkBeneficiaryConsistency(
  beneficiaryCount: number,
  studentEntries: Array<{ attendance: AttendanceStatus }>,
): string | null {
  if (studentEntries.length === 0) return null;

  const tally = tallyAttendance(studentEntries);

  if (tally.hadir === beneficiaryCount) return null;

  if (tally.hadir > beneficiaryCount) {
    return `Jumlah penerima manfaat (${beneficiaryCount}) lebih kecil daripada murid yang tercatat hadir (${tally.hadir}). Periksa kembali angkanya.`;
  }

  return `Jumlah penerima manfaat (${beneficiaryCount}) lebih besar daripada murid yang tercatat hadir (${tally.hadir}). Pastikan selisih ${beneficiaryCount - tally.hadir} orang memang tidak terdaftar sebagai murid.`;
}

export const ATTENDANCE_LABELS: Record<AttendanceStatus, string> = {
  HADIR: "Hadir",
  IZIN: "Izin",
  SAKIT: "Sakit",
  ALPA: "Alpa",
};

export const ATTENDANCE_OPTIONS = (
  Object.keys(ATTENDANCE_LABELS) as AttendanceStatus[]
).map((value) => ({ value, label: ATTENDANCE_LABELS[value] }));
