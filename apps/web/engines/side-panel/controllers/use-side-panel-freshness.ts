"use client"

import { useCallback, useMemo, useState } from "react"
import { useQueryClient, type QueryKey } from "@tanstack/react-query"

/**
 * The query keys a side panel's currently-open record depends on.
 *
 *   - `detail`: the single record query backing the panel's primary card
 *     (e.g. the inventory cells card). Null when the panel has nothing open
 *     or the host seeds its own snapshot (no query to refresh).
 *   - `children`: the child-collection queries shown inside the panel
 *     (e.g. the in-hub adjustments list). One key per list.
 *
 * Keys are the full react-query keys including any scoping id, e.g.
 * `[...INVENTORY_ADJUSTMENTS_QUERY_KEY, inventoryId]`.
 */
export type SidePanelFreshnessConfig = {
  detail?: QueryKey | null
  children?: ReadonlyArray<QueryKey>
}

export type SidePanelFreshnessController = {
  /**
   * Backs the panel's refresh button. Invalidates + refetches every
   * registered key for the open record (detail + children) and tracks the
   * in-flight state so the button can show a spinner. No full page reload.
   */
  refreshAll: () => void
  /**
   * Call after EVERY mutation AND on every section / tab flip. Invalidates all
   * registered keys (detail + children) so:
   *   - no mutation can "forget" a cache (the class of bug where a finalize
   *     updated the panel but left the in-panel list showing the stale row), and
   *   - a flip shows fresh data even though a permanently-mounted panel observer
   *     never remounts (so `refetchOnMount: "always"` alone never fires on a flip).
   */
  invalidateRegistered: () => void
  /** True while `refreshAll` is settling. */
  isRefreshing: boolean
}

/**
 * Owns every refresh path for a side panel centrally, so panel freshness is
 * one mechanism rather than ad-hoc per-mutation / per-flip invalidation
 * scattered across controllers. This is the engine's triage centerpiece: if a
 * panel shows stale data, the question is "did the mutation report to the
 * engine?" (engine layer) vs "did the server return stale rows?" (backend) —
 * not "which of N call sites forgot to invalidate which key?".
 */
export function useSidePanelFreshness(
  config: SidePanelFreshnessConfig,
): SidePanelFreshnessController {
  const queryClient = useQueryClient()
  const [isRefreshing, setIsRefreshing] = useState(false)

  // Callers build keys inline (`[...KEY, id]`), so the arrays have a fresh
  // identity every render. Stabilize on the serialized form so the returned
  // callbacks keep a stable identity while the actual key values are unchanged
  // (consumers may put them in effect / memo deps).
  const detailKey = config.detail ?? null
  const childKeys = config.children ?? EMPTY_KEYS
  const detailSig = detailKey ? JSON.stringify(detailKey) : ""
  const childSig = JSON.stringify(childKeys)

  const children = useMemo<ReadonlyArray<QueryKey>>(
    () => childKeys,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [childSig],
  )
  const detail = useMemo<QueryKey | null>(
    () => detailKey,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [detailSig],
  )

  const invalidateKeys = useCallback(
    (keys: ReadonlyArray<QueryKey>) => {
      const settle = keys.map((queryKey) => queryClient.invalidateQueries({ queryKey }))
      return Promise.all(settle)
    },
    [queryClient],
  )

  const invalidateRegistered = useCallback(() => {
    const keys = detail ? [detail, ...children] : [...children]
    void invalidateKeys(keys)
  }, [detail, children, invalidateKeys])

  const refreshAll = useCallback(() => {
    const keys = detail ? [detail, ...children] : [...children]
    if (keys.length === 0) return
    setIsRefreshing(true)
    void invalidateKeys(keys).finally(() => setIsRefreshing(false))
  }, [detail, children, invalidateKeys])

  return useMemo<SidePanelFreshnessController>(
    () => ({ refreshAll, invalidateRegistered, isRefreshing }),
    [refreshAll, invalidateRegistered, isRefreshing],
  )
}

const EMPTY_KEYS: ReadonlyArray<QueryKey> = []
