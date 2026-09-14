import { buildDefaultNarrative } from "./narrative";
import { renderReportTemplate } from "./template";
import { validateReportData } from "./validation";

import type { GeneratedReport, ReportActivityInput } from "./types";

export type {
  GeneratedReport,
  ReportActivityInput,
  ReportChecklistItem,
  ReportLocationInput,
  ReportTeamMemberInput,
  ReportValidationResult,
} from "./types";

export { buildDefaultNarrative, deriveRegion } from "./narrative";
export { formatTeamList, renderReportTemplate } from "./template";
export { formatChecklist, validateReportData } from "./validation";

export interface GenerateReportOptions {
  /**
   * An existing narrative to keep. Pass the stored narrative whenever the admin
   * has edited it: regenerating the report body must not silently discard their
   * wording (CLAUDE.md section 23). Omit it, or call with
   * `regenerateNarrative: true`, to build a fresh one from the activity data.
   */
  existingNarrative?: string | null;
  /** Explicit "Regenerate Narrative" action; overwrites an edited narrative. */
  regenerateNarrative?: boolean;
}

/**
 * The single entry point for turning activity data into report text.
 *
 * Pure by design: callers load the activity and map it with {@link toReportInput}
 * first. That keeps the database query at the call site, where the right
 * `include` is obvious, and keeps this testable without a database.
 */
export function generateActivityReport(
  activity: ReportActivityInput,
  options: GenerateReportOptions = {},
): GeneratedReport {
  const { existingNarrative, regenerateNarrative = false } = options;

  const shouldKeepExisting =
    !regenerateNarrative &&
    typeof existingNarrative === "string" &&
    existingNarrative.trim().length > 0;

  const narrative = shouldKeepExisting
    ? existingNarrative.trim()
    : buildDefaultNarrative(activity);

  const validation = validateReportData(activity, narrative);
  const text = renderReportTemplate(activity, narrative);

  return { text, narrative, validation };
}

/** The Prisma shape {@link toReportInput} needs. Mirrors the query in the actions. */
export interface ActivityRowForReport {
  date: Date;
  startTime: string;
  endTime: string;
  partner: string;
  beneficiary: string;
  beneficiaryCount: number;
  aidType: string;
  location: { name: string; address: string };
  teamMembers: Array<{
    attendance: ReportActivityInput["teamMembers"][number]["attendance"];
    orderIndex: number;
    teamMember: { fullName: string };
  }>;
  _count?: { documents: number };
  documents?: unknown[];
}

/**
 * Maps a loaded Activity row onto the report module's input shape.
 *
 * Team order follows `orderIndex` because the report lists the team in the
 * order the admin arranged (PRD section 18), and Prisma does not guarantee
 * relation ordering unless asked.
 */
export function toReportInput(row: ActivityRowForReport): ReportActivityInput {
  const documentationCount = row._count?.documents ?? row.documents?.length ?? 0;

  return {
    date: row.date,
    startTime: row.startTime,
    endTime: row.endTime,
    partner: row.partner,
    beneficiary: row.beneficiary,
    beneficiaryCount: row.beneficiaryCount,
    aidType: row.aidType,
    location: { name: row.location.name, address: row.location.address },
    teamMembers: [...row.teamMembers]
      .sort((a, b) => a.orderIndex - b.orderIndex)
      .map((entry) => ({
        fullName: entry.teamMember.fullName,
        attendance: entry.attendance,
      })),
    documentationCount,
  };
}
