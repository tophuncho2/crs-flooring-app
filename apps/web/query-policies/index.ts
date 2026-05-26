export type ListFreshness = {
  refetchIntervalMs?: number
  staleTimeMs?: number
}

export const LIST_FRESHNESS_LIVE: ListFreshness = {
  refetchIntervalMs: 5_000,
  staleTimeMs: 0,
}

export const LIST_FRESHNESS_STANDARD: ListFreshness = {
  refetchIntervalMs: 10_000,
  staleTimeMs: 5_000,
}

export const LIST_FRESHNESS_OFF: ListFreshness = {
  refetchIntervalMs: undefined,
  staleTimeMs: 30_000,
}

/**
 * React-query option fragment for side-panel + picker queries: treat data as
 * always stale and refetch whenever an observer mounts (i.e. every time the
 * panel or picker (re)opens), so the user never sees a snapshot left over from
 * a previous open. Pair with `placeholderData: keepPreviousData` / seeded
 * `initialData` where an instant first paint matters — the cached value shows
 * immediately, then the fresh result replaces it.
 */
export const FRESH_ON_OPEN = {
  staleTime: 0,
  refetchOnMount: "always",
} as const
