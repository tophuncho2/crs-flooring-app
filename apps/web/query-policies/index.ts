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
