import type {
  ReportActivityInput,
  ReportChecklistItem,
  ReportValidationResult,
} from "./types";

function isFilled(value: string | null | undefined): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

/**
 * The required-data checklist from PRD section 20 / CLAUDE.md section 22.
 *
 * This always returns every item, satisfied or not, because the UI shows the
 * whole checklist with check and cross marks rather than only the failures —
 * the admin needs to see what is already done as much as what is missing.
 *
 * A draft may be saved at any time; this only gates *final* report generation.
 */
export function validateReportData(
  activity: ReportActivityInput,
  narrative: string,
): ReportValidationResult {
  const checklist: ReportChecklistItem[] = [
    {
      label: "Tanggal kegiatan",
      satisfied:
        activity.date instanceof Date && !Number.isNaN(activity.date.getTime()),
    },
    {
      label: "Lokasi kegiatan",
      satisfied:
        isFilled(activity.location?.name) &&
        isFilled(activity.location?.address),
    },
    {
      label: "Waktu kegiatan",
      satisfied: isFilled(activity.startTime) && isFilled(activity.endTime),
    },
    { label: "Mitra", satisfied: isFilled(activity.partner) },
    { label: "Penerima manfaat", satisfied: isFilled(activity.beneficiary) },
    {
      label: "Jumlah penerima manfaat",
      satisfied:
        Number.isInteger(activity.beneficiaryCount) &&
        activity.beneficiaryCount > 0,
    },
    { label: "Jenis bantuan", satisfied: isFilled(activity.aidType) },
    {
      label: "Tim yang bertugas",
      satisfied: activity.teamMembers.length > 0,
    },
    {
      label: "Dokumentasi",
      satisfied: activity.documentationCount > 0,
    },
    { label: "Narasi", satisfied: isFilled(narrative) },
  ];

  const missing = checklist
    .filter((item) => !item.satisfied)
    .map((item) => item.label);

  return {
    isComplete: missing.length === 0,
    checklist,
    missing,
  };
}

/**
 * Formats the checklist the way the PRD shows it, for toasts and server-action
 * error messages where a rendered component is not available.
 */
export function formatChecklist(result: ReportValidationResult): string {
  return result.checklist
    .map((item) => `${item.satisfied ? "✓" : "✗"} ${item.label}`)
    .join("\n");
}
