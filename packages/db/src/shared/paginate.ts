/**
 * Split a take+1 fetch into the page + a next-page flag (the async-picker
 * pagination convention).
 *
 * Callers fetch `take + 1` rows, then pass the ORIGINAL page size `take`: if an
 * extra row came back, `hasMore` is true and that row is trimmed off. The caller
 * keeps its own `.map(normalizer)` + result-key shape (`items` vs `rows`) — this
 * owns only the slice + flag, so the take+1 convention lives in exactly one place.
 */
export function sliceHasMore<T>(rows: T[], take: number): { page: T[]; hasMore: boolean } {
  const hasMore = rows.length > take
  return { page: hasMore ? rows.slice(0, take) : rows, hasMore }
}
