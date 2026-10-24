/**
 * Pagination helper (guide §6.6): page starts at 1, limit capped so a large
 * page request cannot dump the whole collection.
 */
export const DEFAULT_PAGE_SIZE = 9;
export const MAX_PAGE_SIZE = 50;

export function parsePagination(query = {}, defaultSize = DEFAULT_PAGE_SIZE) {
  const page = Math.max(1, toInt(query.page, 1));
  const limit = Math.min(MAX_PAGE_SIZE, Math.max(1, toInt(query.limit, defaultSize)));
  const skip = (page - 1) * limit;
  return { page, limit, skip };
}

function toInt(value, fallback) {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

/** Builds the pagination meta that accompanies every list response. */
export function listMeta(items, total, page, limit) {
  return {
    data: items,
    page,
    limit,
    total,
    pages: Math.max(1, Math.ceil(total / limit)),
  };
}
