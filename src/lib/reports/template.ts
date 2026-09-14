import { formatHari, formatTanggal } from "@/lib/dates";

import type { ReportActivityInput, ReportTeamMemberInput } from "./types";

/**
 * Suffix appended after a team member's name in the report.
 *
 * HADIR prints the bare name — attendance is the expected case and the original
 * reports never annotated it (PRD section 18).
 */
const ATTENDANCE_SUFFIX: Record<ReportTeamMemberInput["attendance"], string> = {
  HADIR: "",
  IZIN: " (izin)",
  SAKIT: " (sakit)",
  ALPA: " (alpa)",
};

/**
 * Renders the team block, preserving the order the admin arranged.
 * Returns an empty string for an empty team so the caller can decide how to
 * handle it; report validation already blocks finalizing without a team.
 */
export function formatTeamList(members: ReportTeamMemberInput[]): string {
  return members
    .map(
      (member) => `- ${member.fullName}${ATTENDANCE_SUFFIX[member.attendance]}`,
    )
    .join("\n");
}

/**
 * The default report template from PRD section 17.
 *
 * Where CLAUDE.md section 21 and the PRD differ by a single space in the
 * "Narasi" heading, the PRD wins: the brief names it the product specification
 * and it is the text the team actually sends.
 *
 * The asterisks are WhatsApp bold markers and the blank lines are load-bearing,
 * so this is built as an explicit line array rather than a template literal —
 * it keeps trailing spaces from creeping in and makes the blank lines visible.
 */
export function renderReportTemplate(
  activity: ReportActivityInput,
  narrative: string,
): string {
  const hari = formatHari(activity.date);
  const tanggal = formatTanggal(activity.date);

  return [
    "*Assalamualaikum warahmatullahi wabarakatuh*",
    "*Izin Melaporkan Kegiatan Tazkia Mengajar*",
    "",
    "*📝 Nama Kegiatan*",
    "*Tazkia Mengajar*",
    "*(Mencerdaskan Generasi Penerus Bangsa)*",
    "",
    "*🤝 Mitra:*",
    activity.partner,
    "",
    "*📆 Hari, Tanggal :*",
    `${hari}, ${tanggal}`,
    "",
    "*📍 Lokasi Kegiatan :*",
    activity.location.address,
    "",
    "*⏰ Waktu Kegiatan:*",
    `Pukul ${activity.startTime} s/d ${activity.endTime} WIB`,
    "",
    "*🏹Penerima Manfaat:*",
    activity.beneficiary,
    "",
    "*👨‍👩‍👦 Jumlah penerima manfaat:*",
    "",
    `- ${activity.beneficiaryCount} anak`,
    "",
    "*🎁 Jenis Bantuan:*",
    "",
    `- ${activity.aidType}`,
    "",
    "⛑️ *Tim yang bertugas*",
    "",
    formatTeamList(activity.teamMembers),
    "",
    "📷 Dokumentasi :",
    "(terlampir)",
    "",
    "📄 *Narasi :*",
    narrative,
    "",
    "*Tazkia Mengajar x BaitulMal Tazkia*",
    "",
    "*Wassalamualaikum warahmatullahi wabarakatuh*",
  ].join("\n");
}
