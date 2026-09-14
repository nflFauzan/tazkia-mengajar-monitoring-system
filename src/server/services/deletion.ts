/**
 * Shared vocabulary for the "archive instead of delete" rule.
 *
 * Master data that history already references must never be hard-deleted, or
 * past reports stop rendering correctly (docs/database-design.md section 5).
 * Each entity's action counts its references and, when any exist, refuses the
 * delete and tells the admin to archive instead.
 */

export interface ReferenceCount {
  label: string;
  count: number;
}

/**
 * Builds the refusal message for a delete that would destroy history.
 * Returns null when nothing references the row, meaning the delete is safe.
 */
export function describeBlockingReferences(
  references: ReferenceCount[],
): string | null {
  const blocking = references.filter((reference) => reference.count > 0);

  if (blocking.length === 0) return null;

  const parts = blocking.map(
    (reference) => `${reference.count} ${reference.label}`,
  );

  // "a, b, dan c" rather than "a dan b dan c".
  const detail =
    parts.length === 1
      ? parts[0]
      : `${parts.slice(0, -1).join(", ")}, dan ${parts.at(-1)}`;

  return `Data ini sudah digunakan pada ${detail}, jadi tidak bisa dihapus. Arsipkan saja agar riwayat tetap utuh.`;
}
