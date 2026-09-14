import type { AttendanceStatus } from "@prisma/client";

/**
 * The shape the report module needs, deliberately decoupled from Prisma's
 * generated row types.
 *
 * Report rendering is pure: it takes this structure and returns text. Keeping
 * it independent of the database rows means the template, the narrative and the
 * validation checklist can all be unit-tested without a database, and it makes
 * the required inputs explicit rather than implied by whatever `include` the
 * caller happened to use.
 */
export interface ReportTeamMemberInput {
  fullName: string;
  attendance: AttendanceStatus;
}

export interface ReportLocationInput {
  name: string;
  address: string;
}

export interface ReportActivityInput {
  date: Date;
  startTime: string;
  endTime: string;
  partner: string;
  beneficiary: string;
  beneficiaryCount: number;
  aidType: string;
  location: ReportLocationInput;
  /** Already ordered the way the admin arranged them. */
  teamMembers: ReportTeamMemberInput[];
  /** Only the count matters to the template; files are attached separately. */
  documentationCount: number;
}

/** One line of the "what is still missing" checklist shown before finalizing. */
export interface ReportChecklistItem {
  label: string;
  satisfied: boolean;
}

export interface ReportValidationResult {
  isComplete: boolean;
  checklist: ReportChecklistItem[];
  /** Labels of the unsatisfied items, for concise error messages. */
  missing: string[];
}

export interface GeneratedReport {
  /** The full WhatsApp-ready text. */
  text: string;
  /** The narrative used, whether supplied by the admin or freshly generated. */
  narrative: string;
  validation: ReportValidationResult;
}
