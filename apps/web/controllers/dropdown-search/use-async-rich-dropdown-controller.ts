"use client"

import { keepPreviousData, useQuery } from "@tanstack/react-query"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"

const DEFAULT_DEBOUNCE_MS = 250

export type AsyncRichDropdownControllerInput<TOption> = {
  /** Stable cache-key prefix; the trimmed query is appended automatically. */
  bucketKey: ReadonlyArray<unknown>
  searchFn: (query: string, signal: AbortSignal | undefined) => Promise<TOption[]>
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
}

/**
 * Debounced query state + React Query fetcher for the async rich dropdown.
 * Returns the live query input value so the dropdown stays responsive while
 * the trimmed value drives the cache key. `keepPreviousData` prevents the
 * popover from flashing empty between strokes.
 */
export function useAsyncRichDropdownController<TOption>(
  input: AsyncRichDropdownControllerInput<TOption>,
): AsyncRichDropdownControllerOutput<TOption> {
  const debounceMs = input.debounceMs ?? DEFAULT_DEBOUNCE_MS
  const minQueryLength = input.minQueryLength ?? 0
  const enabled = input.enabled ?? true
  const initialOptions = input.initialOptions

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

  const queryResult = useQuery<TOption[]>({
    queryKey,
    queryFn: ({ signal }) => input.searchFn(debouncedQuery, signal),
    enabled: queryEnabled,
    placeholderData: keepPreviousData,
    initialData:
      initialOptions && debouncedQuery.length === 0 ? initialOptions : undefined,
    staleTime: 30_000,
  })

  const errorMessage = queryResult.error
    ? queryResult.error instanceof Error
      ? queryResult.error.message
      : "Failed to load options"
    : null

  const { refetch: queryRefetch } = queryResult
  const refetch = useCallback(() => {
    if (!queryEnabled) return
    void queryRefetch()
  }, [queryEnabled, queryRefetch])

  return {
    query,
    onQueryChange: setQuery,
    options: queryResult.data ?? [],
    isLoading: queryResult.isLoading,
    isFetching: queryResult.isFetching,
    errorMessage,
    refetch,
  }
}
