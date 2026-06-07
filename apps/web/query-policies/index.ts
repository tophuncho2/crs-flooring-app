/**
 * React-query option fragment for picker queries: treat data as
 * always stale and refetch whenever an observer mounts (i.e. every time the
 * picker (re)opens), so the user never sees a snapshot left over from
 * a previous open. Pair with `placeholderData: keepPreviousData` / seeded
 * `initialData` where an instant first paint matters — the cached value shows
 * immediately, then the fresh result replaces it.
 */
export const FRESH_ON_OPEN = {
  staleTime: 0,
  refetchOnMount: "always",
} as const
