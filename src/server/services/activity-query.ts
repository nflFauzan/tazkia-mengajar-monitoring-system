import type { Prisma } from "@prisma/client";

import { parseDateInput } from "@/lib/dates";

/**
 * Turns URL search parameters into a Prisma `where` clause for activities.
 *
 * The list page and the Excel export both call this, which is what guarantees
 * the requirement that an export reflects the filters currently on screen —
 * they cannot drift apart because there is only one implementation.
 */

export interface ActivityFilterParams {
  q?: string;
  from?: string;
  to?: string;
  locationId?: string;
  status?: string;
  teamMemberId?: string;
}

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const STATUSES = new Set(["DRAFT", "COMPLETED", "CANCELLED"]);

/** Reads the filters out of a Next.js `searchParams` object, ignoring junk. */
export function readActivityFilters(
  params: Record<string, string | string[] | undefined>,
): ActivityFilterParams {
  const read = (key: string): string | undefined => {
    const value = params[key];
    return typeof value === "string" && value.trim() ? value.trim() : undefined;
  };

  return {
    q: read("q")?.slice(0, 120),
    from: read("from"),
    to: read("to"),
    locationId: read("locationId"),
    status: read("status"),
    teamMemberId: read("teamMemberId"),
  };
}

export function buildActivityWhere(
  filters: ActivityFilterParams,
): Prisma.ActivityWhereInput {
  const where: Prisma.ActivityWhereInput = {};

  if (filters.q) {
    where.OR = [
      { beneficiary: { contains: filters.q, mode: "insensitive" } },
      { aidType: { contains: filters.q, mode: "insensitive" } },
      { partner: { contains: filters.q, mode: "insensitive" } },
      { location: { name: { contains: filters.q, mode: "insensitive" } } },
    ];
  }

  // Malformed dates are ignored rather than rejected: a half-typed date in the
  // picker should not blank the whole list.
  const from = filters.from && DATE_PATTERN.test(filters.from)
    ? parseDateInput(filters.from)
    : undefined;
  const to = filters.to && DATE_PATTERN.test(filters.to)
    ? parseDateInput(filters.to)
    : undefined;

  if (from || to) {
    where.date = {
      ...(from ? { gte: from } : {}),
      ...(to ? { lte: to } : {}),
    };
  }

  if (filters.locationId) {
    where.locationId = filters.locationId;
  }

  if (filters.status && STATUSES.has(filters.status)) {
    where.status = filters.status as Prisma.ActivityWhereInput["status"];
  }

  if (filters.teamMemberId) {
    where.teamMembers = { some: { teamMemberId: filters.teamMemberId } };
  }

  return where;
}
