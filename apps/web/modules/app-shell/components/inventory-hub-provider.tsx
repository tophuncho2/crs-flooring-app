"use client"

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  type ReactNode,
} from "react"
import { useQueryClient } from "@tanstack/react-query"
import { InventoryHubSidePanel } from "@/modules/inventory/components/side-panel/hub"
import { useInventoryHubSidePanel } from "@/modules/inventory/controllers/inventory-hub-side-panel"
import { INVENTORY_LIST_QUERY_KEY } from "@/modules/inventory/data/list-inventory-request"
import { ADJUSTMENTS_LIST_QUERY_KEY } from "@/modules/adjustments/data/list-adjustments-request"
import type { AdjustmentPanelRow } from "@/modules/adjustments"

export type InventoryHubContextValue = {
  /** Open the hub straight into an inventory's view (list-view row click). */
  openForView: (inventoryId: string) => void
  /** Open the hub straight into a adjustment's edit panel (adjustments ledger row). */
  openForAdjustmentEdit: (row: AdjustmentPanelRow) => void
}

const InventoryHubContext = createContext<InventoryHubContextValue | null>(null)

/**
 * Mounts the single, app-wide inventory hub side panel once and shares its
 * openers via context. Every dashboard surface that opens the hub (the
 * inventory list, the adjustments ledger) drives this one instance, so there is
 * exactly one inventory hub in the DOM and one piece of state. Record-page
 * instances (the work-orders material-items section) intentionally keep their
 * own scoped instance and do not go through here.
 */
export function InventoryHubProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()

  // Any hub-driven mutation refreshes the external list views so a record
  // edited through the shared hub never leaves a stale row behind. The hub's
  // own controller already invalidates the inventory detail + adjustments caches.
  const invalidateLists = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: [...INVENTORY_LIST_QUERY_KEY] })
    void queryClient.invalidateQueries({ queryKey: [...ADJUSTMENTS_LIST_QUERY_KEY] })
  }, [queryClient])

  const hubPanel = useInventoryHubSidePanel({
    initialInventory: null,
    publishAdjustmentPatch: invalidateLists,
    onInventoryUpdated: invalidateLists,
  })

  const value = useMemo<InventoryHubContextValue>(
    () => ({
      openForView: hubPanel.openForView,
      openForAdjustmentEdit: hubPanel.openForAdjustmentEdit,
    }),
    [hubPanel.openForView, hubPanel.openForAdjustmentEdit],
  )

  return (
    <InventoryHubContext.Provider value={value}>
      {children}
      <InventoryHubSidePanel controller={hubPanel} />
    </InventoryHubContext.Provider>
  )
}

export function useInventoryHub(): InventoryHubContextValue {
  const value = useContext(InventoryHubContext)
  if (value === null) {
    throw new Error("useInventoryHub must be used within an InventoryHubProvider")
  }
  return value
}
