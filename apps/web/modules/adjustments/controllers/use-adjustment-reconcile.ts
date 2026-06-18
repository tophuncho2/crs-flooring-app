"use client"

import { useCallback } from "react"
import { useRouter } from "next/navigation"
import { useQueryClient } from "@tanstack/react-query"

/**
 * Strong post-mutation reconcile for adjustments — the single source of "show
 * fresh data" every adjustment surface calls after a create / edit / delete.
 *
 * One adjustment touches data across pages: the inventory it deducts (its
 * balance chain, its adjustments list, the inventory list), the work order it
 * links to, and the standalone adjustments ledger. Rather than have each surface
 * guess which of those it must refresh, this invalidates every adjustment-
 * affected react-query cache by *prefix* and refreshes the server components — so
 * whatever page is mounted reflects the mutation, not just the one that triggered
 * it.
 *
 * Prefix invalidation matches every query whose key starts with the given root
 * (`["inventory", …]`, `["adjustments", …]`, `["work-orders", …]`), so per-id
 * and per-page keys all go stale in one call. `router.refresh()` re-renders the
 * server-rendered surfaces (the work-order record + its Adjustments grid, list
 * RSCs) that aren't react-query backed.
 *
 * Hosts that hold their own non-react-query record state still do an in-place
 * refresh on top of this (e.g. the inventory record view re-fetches its detail
 * record for the live balance chain); this covers everything cache- or
 * RSC-backed.
 */
export function useAdjustmentReconcile() {
  const queryClient = useQueryClient()
  const router = useRouter()

  return useCallback(() => {
    // Bare roots on purpose: prefix-matching also marks the option-search pickers
    // stale (inventory locations/import-numbers/POs/merge-candidates, the WO picker),
    // but those have no active observer here so they only lazy-refetch on next use —
    // the freshness guarantee is worth the negligible collateral.
    void queryClient.invalidateQueries({ queryKey: ["inventory"] })
    void queryClient.invalidateQueries({ queryKey: ["adjustments"] })
    void queryClient.invalidateQueries({ queryKey: ["work-orders"] })
    router.refresh()
  }, [queryClient, router])
}
