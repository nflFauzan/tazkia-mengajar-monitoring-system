/**
 * Server-side pagination helpers.
 *
 * Lists in this app are paginated in SQL, never by loading a table and slicing
 * it in the browser (CLAUDE.md section 27). These helpers turn untrusted query
 * parameters into a safe `skip`/`take`.
 */

/** PRD section 46 asks for 20-25 rows per page. */
export const PAGE_SIZE = 20;

export interface PageParams {
  page: number;
  skip: number;
  take: number;
}

/**
 * Parses `?page=` defensively: a missing, non-numeric, zero or negative value
 * all fall back to page 1, and the page is capped so a hand-edited URL cannot
 * ask the database for an absurd offset.
 */
export function parsePageParam(value: string | undefined): PageParams {
  const parsed = Number.parseInt(value ?? "1", 10);
  const page =
    Number.isFinite(parsed) && parsed > 0 ? Math.min(parsed, 10_000) : 1;

  return {
    page,
    skip: (page - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
  };
}

/** Trims a search box value, treating blank input as "no filter". */
export function parseSearchParam(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed.slice(0, 120) : undefined;
}

export interface PaginationMeta {
  page: number;
  pageCount: number;
  total: number;
  from: number;
  to: number;
}

export function buildPaginationMeta(
  total: number,
  page: number,
): PaginationMeta {
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return {
    page,
    pageCount,
    total,
    from: total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1,
    to: Math.min(page * PAGE_SIZE, total),
  };
}
