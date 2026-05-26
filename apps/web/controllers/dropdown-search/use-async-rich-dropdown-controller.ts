"use client"

import { keepPreviousData, useInfiniteQuery } from "@tanstack/react-query"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { FRESH_ON_OPEN } from "@/query-policies"

const DEFAULT_DEBOUNCE_MS = 250

export type AsyncRichDropdownPagedPage<TOption> = {
  items: TOption[]
  hasMore: boolean
}

export type AsyncRichDropdownControllerInput<TOption> = {
  /** Stable cache-key prefix; the trimmed query is appended automatically. */
  bucketKey: ReadonlyArray<unknown>
  /**
   * Legacy single-page fetch. Returns every match in one shot, capped at the
   * helper's own page size. Mutually exclusive with `pagedSearchFn`.
   */
  searchFn?: (
    query: string,
    signal: AbortSignal | undefined,
  ) => Promise<TOption[]>
  /**
   * Paginated fetch. When provided, the controller switches to
   * infinite-scroll mode: it calls this with increasing `skip` values until
   * `hasMore` is false. Mutually exclusive with `searchFn`.
   */
  pagedSearchFn?: (
    query: string,
    signal: AbortSignal | undefined,
    skip: number,
  ) => Promise<AsyncRichDropdownPagedPage<TOption>>
  debounceMs?: number
  /** Suppress calls until the user types this many characters (default 0). */
  minQueryLength?: number
  /** Default seed shown before the user types anything. */
  initialOptions?: TOption[]
  /** When false, the controller skips fetching entirely (e.g. dropdown closed). */
  enabled?: boolean
}

export type AsyncRichDropdownControllerOutput<TOption> = {
  query: string
  onQueryChange: (value: string) => void
  /** Flattened across all fetched pages of the current query. */
  options: TOption[]
  isLoading: boolean
  isFetching: boolean
  errorMessage: string | null
  /**
   * Force a refetch of the current bucket (ignores `staleTime`). Use for
   * "refresh on open" wiring on pickers whose option subtitles surface
   * mutable state (e.g. inventory stock balance) that the user expects to
   * see freshened every time the popover opens.
   */
  refetch: () => void
  /**
   * True when the server reported another page is available. Always false
   * for `searchFn` (single-page) callers.
   */
  hasMore: boolean
  /** True while a subsequent page is in flight (page 1 uses `isFetching`). */
  isFetchingMore: boolean
  /**
   * Idempotent — calling while a page is already in flight or when
   * `hasMore` is false is a no-op. Safe to wire to scroll-bottom detection
   * that can fire repeatedly.
   */
  loadMore: () => void
}

type PageEnvelope<TOption> = { items: TOption[]; hasMore: boolean }

/**
 * Debounced query state + React Query infinite fetcher for the async rich
 * dropdown. Returns the live query input value so the dropdown stays
 * responsive while the trimmed value drives the cache key.
 * `keepPreviousData` prevents the popover from flashing empty between
 * strokes; pages flatten into a single `options` array for consumers.
 *
 * Two fetcher modes:
 *   - `searchFn(query, signal)` — legacy single page. `hasMore` is always
 *     false; `loadMore` is a no-op. Use for pickers whose backing endpoint
 *     doesn't support `skip` yet.
 *   - `pagedSearchFn(query, signal, skip)` — paginated. The controller calls
 *     it with increasing `skip` values until `{ hasMore: false }` is
 *     returned.
 */
export function useAsyncRichDropdownController<TOption>(
  input: AsyncRichDropdownControllerInput<TOption>,
): AsyncRichDropdownControllerOutput<TOption> {
  const debounceMs = input.debounceMs ?? DEFAULT_DEBOUNCE_MS
  const minQueryLength = input.minQueryLength ?? 0
  const enabled = input.enabled ?? true
  const initialOptions = input.initialOptions
  const { searchFn, pagedSearchFn } = input

  const [query, setQuery] = useState("")
  const [debouncedQuery, setDebouncedQuery] = useState("")
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setDebouncedQuery(query.trim())
    }, debounceMs)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [query, debounceMs])

  const trimmedQueryLength = debouncedQuery.length
  const queryEnabled = enabled && trimmedQueryLength >= minQueryLength

  const queryKey = useMemo(
    () => [...input.bucketKey, debouncedQuery],
    [input.bucketKey, debouncedQuery],
  )

  const seededInitialData = useMemo(() => {
    if (!initialOptions) return undefined
    if (debouncedQuery.length > 0) return undefined
    return {
      pages: [{ items: initialOptions, hasMore: false }],
      pageParams: [0],
    }
  }, [initialOptions, debouncedQuery])

  const queryResult = useInfiniteQuery<PageEnvelope<TOption>>({
    queryKey,
    queryFn: async ({ signal, pageParam }) => {
      const skip = typeof pageParam === "number" ? pageParam : 0
      if (pagedSearchFn) {
        return pagedSearchFn(debouncedQuery, signal, skip)
      }
      if (searchFn) {
        const items = await searchFn(debouncedQuery, signal)
        return { items, hasMore: false }
      }
      throw new Error(
        "useAsyncRichDropdownController: provide either `searchFn` or `pagedSearchFn`",
      )
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      if (!lastPage.hasMore) return undefined
      return allPages.reduce((acc, page) => acc + page.items.length, 0)
    },
    enabled: queryEnabled,
    placeholderData: keepPreviousData,
    initialData: seededInitialData,
    // Fresh on every open: pickers re-fetch when re-opened so newly
    // created/edited records show up instead of a cached snapshot. The
    // seeded/previous data still paints instantly while the refetch runs.
    ...FRESH_ON_OPEN,
  })

  const flatOptions = useMemo(() => {
    if (!queryResult.data) return []
    return queryResult.data.pages.flatMap((page) => page.items)
  }, [queryResult.data])

  const errorMessage = queryResult.error
    ? queryResult.error instanceof Error
      ? queryResult.error.message
      : "Failed to load options"
    : null

  const { refetch: queryRefetch, fetchNextPage, hasNextPage, isFetchingNextPage } =
    queryResult
  const refetch = useCallback(() => {
    if (!queryEnabled) return
    void queryRefetch()
  }, [queryEnabled, queryRefetch])

  const loadMore = useCallback(() => {
    if (!hasNextPage || isFetchingNextPage) return
    void fetchNextPage()
  }, [hasNextPage, isFetchingNextPage, fetchNextPage])

  return {
    query,
    onQueryChange: setQuery,
    options: flatOptions,
    isLoading: queryResult.isLoading,
    isFetching: queryResult.isFetching,
    errorMessage,
    refetch,
    hasMore: !!hasNextPage,
    isFetchingMore: isFetchingNextPage,
    loadMore,
  }
}
