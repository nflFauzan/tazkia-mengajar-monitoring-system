import { formatHari, formatTanggal } from "@/lib/dates";

import type { ReportActivityInput } from "./types";

/**
 * Best-effort guess at the administrative region from a free-text address, used
 * only as a default in the generated narrative.
 *
 * Addresses are entered by hand and have no reliable structure, so this looks
 * for the administrative prefixes Indonesian addresses conventionally use and
 * takes the most specific match. The admin can always edit the narrative, so a
 * wrong guess is a cosmetic annoyance rather than a data problem — which is why
 * this stays a heuristic instead of becoming a required `region` column.
 */
export function deriveRegion(address: string): string | null {
  const segments = address
    .split(/[,\n]/)
    .map((segment) => segment.trim())
    .filter(Boolean);

  // Most specific first: a kecamatan is a better narrative subject than a
  // province, and "Kel."/"Desa" is better still.
  const prefixes = [
    /^Kel(?:urahan)?\.?\s+(.+)$/i,
    /^Desa\s+(.+)$/i,
    /^Kec(?:amatan)?\.?\s+(.+)$/i,
    /^Kota\s+(.+)$/i,
    /^Kab(?:upaten)?\.?\s+(.+)$/i,
  ];

  for (const prefix of prefixes) {
    for (const segment of segments) {
      const match = segment.match(prefix);
      if (match) return match[1].trim();
    }
  }

  return null;
}

/**
 * Turns the recorded aid type into the "dengan tujuan untuk ..." clause.
 * Admins write things like "Mengajar" or "Pembagian buku"; lowercasing the
 * first letter keeps the sentence readable without mangling acronyms.
 */
function toPurposeClause(aidType: string): string {
  const trimmed = aidType.trim();
  if (!trimmed) return "membantu kegiatan belajar anak-anak";

  const isAcronym = trimmed.slice(0, 3) === trimmed.slice(0, 3).toUpperCase();
  return isAcronym ? trimmed : trimmed[0].toLowerCase() + trimmed.slice(1);
}

/**
 * The default narrative from PRD section 19. The admin may edit it afterwards,
 * and an edited narrative is never silently regenerated.
 */
export function buildDefaultNarrative(activity: ReportActivityInput): string {
  const hari = formatHari(activity.date);
  const tanggal = formatTanggal(activity.date);
  const tujuan = toPurposeClause(activity.aidType);
  const lokasiSingkat = activity.location.name;
  const wilayah = deriveRegion(activity.location.address) ?? lokasiSingkat;

  return [
    `Alhamdulillah pada hari ini ${hari} tanggal ${tanggal} telah dilaksanakan kegiatan *Tazkia Mengajar* kolaborasi antara Tazkia bersama Baitulmal Tazkia dengan tujuan untuk ${tujuan} yang berlokasi di ${lokasiSingkat}, ${wilayah}.`,
    "",
    `Semoga program *Tazkia Mengajar* yang diadakan oleh Baitulmal Tazkia bersama Tazkia untuk anak-anak di wilayah ${wilayah} bermanfaat dan bisa terus berjalan.`,
    "",
    "Demikian laporan Tazkia Mengajar dari tempat kegiatan berlangsung.",
    "",
    "Jazakallah Wassalamualaikum..",
  ].join("\n");
}
