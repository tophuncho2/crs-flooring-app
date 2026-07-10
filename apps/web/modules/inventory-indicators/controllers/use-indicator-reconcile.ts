"use client"

import { useCallback } from "react"
import { useRouter } from "next/navigation"
import { useQueryClient } from "@tanstack/react-query"

/**
 * Post-mutation reconcile for inventory indicators — the "show fresh data" call
 * every indicator surface runs after a create / edit / delete.
 *
 * An indicator mutation touches the standalone indicators list and the product
 * record view's indicators section. Prefix-invalidates both react-query roots
 * (`["inventory-indicators", …]`, `["products", …]`) so per-id and per-page keys
 * all go stale in one call, then `router.refresh()` re-renders the RSC surfaces.
 */
export function useIndicatorReconcile() {
  const queryClient = useQueryClient()
  const router = useRouter()

  return useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ["inventory-indicators"] })
    void queryClient.invalidateQueries({ queryKey: ["products"] })
    router.refresh()
  }, [queryClient, router])
}
