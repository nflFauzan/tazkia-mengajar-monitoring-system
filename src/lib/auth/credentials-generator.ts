/**
 * Helpers for auto-generating standardized usernames and temporary passwords
 * for Tazkia Mengajar educators.
 */

export interface UsernameOptions {
  /** If true, username has no year suffix (e.g. name@tazkiamengajar.id) */
  isFounder?: boolean;
  /** 2-digit year for new members (e.g. "26" for 2026). Defaults to current year modulo 100. */
  year?: string;
}

/**
 * Generates a standardized login username:
 * - Founder / Core: `[nama]@tazkiamengajar.id`
 * - New member: `[nama].[tahun]@tazkiamengajar.id`
 */
export function generatePengajarUsername(
  fullName: string,
  nickname?: string | null,
  options?: UsernameOptions,
): string {
  const preferredName = nickname?.trim() || fullName.trim().split(/\s+/)[0] || "pengajar";
  const cleanName = preferredName
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

  const safeName = cleanName || "pengajar";

  if (options?.isFounder) {
    return `${safeName}@tazkiamengajar.id`;
  }

  const year =
    options?.year?.replace(/[^0-9]/g, "") ||
    (new Date().getFullYear() % 100).toString().padStart(2, "0");

  return `${safeName}.${year}@tazkiamengajar.id`;
}

/**
 * Generates a readable, secure temporary password (e.g. "TM-84921").
 * Meets the minimum 8 characters requirement (3 chars "TM-" + 5 digits = 8 chars).
 */
export function generateTemporaryPassword(): string {
  // Generate a random 5-digit number between 10000 and 99999
  const randomNum = Math.floor(10000 + Math.random() * 90000);
  return `TM-${randomNum}`;
}
