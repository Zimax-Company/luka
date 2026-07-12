// Shared pagination helpers for list APIs.

export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

export interface PaginationParams {
  page: number;
  pageSize: number;
}

export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

/**
 * Parse pagination params from a query string. Pagination is opt-in: returns
 * `null` when none of `page`/`pageSize`/`limit` are present, so existing callers
 * that expect the full collection keep working unchanged.
 */
export function parsePagination(searchParams: URLSearchParams): PaginationParams | null {
  const pageRaw = searchParams.get('page');
  const sizeRaw = searchParams.get('pageSize') ?? searchParams.get('limit');

  if (pageRaw === null && sizeRaw === null) return null;

  let page = parseInt(pageRaw ?? '1', 10);
  if (isNaN(page) || page < 1) page = 1;

  let pageSize = parseInt(sizeRaw ?? String(DEFAULT_PAGE_SIZE), 10);
  if (isNaN(pageSize) || pageSize < 1) pageSize = DEFAULT_PAGE_SIZE;
  if (pageSize > MAX_PAGE_SIZE) pageSize = MAX_PAGE_SIZE;

  return { page, pageSize };
}

/** Build pagination metadata for a known total count. */
export function buildMeta(page: number, pageSize: number, total: number): PaginationMeta {
  const totalPages = total === 0 ? 0 : Math.ceil(total / pageSize);
  return {
    page,
    pageSize,
    total,
    totalPages,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1,
  };
}

/** Paginate an in-memory array, returning the page slice plus metadata. */
export function paginateArray<T>(items: T[], { page, pageSize }: PaginationParams): { data: T[]; pagination: PaginationMeta } {
  const total = items.length;
  const start = (page - 1) * pageSize;
  return {
    data: items.slice(start, start + pageSize),
    pagination: buildMeta(page, pageSize, total),
  };
}
