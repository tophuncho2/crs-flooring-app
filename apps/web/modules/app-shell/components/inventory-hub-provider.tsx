"use client"

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  type ReactNode,
} from "react"
import { useQueryClient } from "@tanstack/react-query"
import { HubSidePanelShell } from "@/components/hub-side-panel"
import { InventoryHubSidePanel } from "@/modules/inventory/components/side-panel/hub"
import { InventoryHubStartingBody } from "@/modules/inventory/components/side-panel/starting/inventory-hub-starting-body"
import { useInventoryHubStartingController } from "@/modules/inventory/controllers/inventory-hub-starting/use-inventory-hub-starting-controller"
import { INVENTORY_LIST_QUERY_KEY } from "@/modules/inventory/data/list-inventory-request"
import { ADJUSTMENTS_LIST_QUERY_KEY } from "@/modules/adjustments/data/list-adjustments-request"
import type { AdjustmentPanelRow } from "@/modules/adjustments"

export type InventoryHubContextValue = {
  /** Open the inventory-hub starting-spot cascade (header button). */
  openInventoryHub: () => void
  /** Open the hub straight into an inventory's view (list-view row click). */
  openForView: (inventoryId: string) => void
  /** Open the hub straight into a adjustment's edit panel (adjustments ledger row). */
  openForAdjustmentEdit: (row: AdjustmentPanelRow) => void
}

const InventoryHubContext = createContext<InventoryHubContextValue | null>(null)

/**
 * Mounts the single, app-wide inventory hub + starting-spot cascade once and
 * shares its openers via context — the inventory-hub parallel of
 * `HubPanelProvider`. Every dashboard surface (the header button, the
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

  const controller = useInventoryHubStartingController({
    publishAdjustmentPatch: invalidateLists,
    onInventoryUpdated: invalidateLists,
  })

  const { open, handleClose, hubPanel, openStarting, openInventoryView } = controller

  const openForAdjustmentEdit = useCallback(
    (row: AdjustmentPanelRow) => {
      controller.setOpen(false)
      hubPanel.openForAdjustmentEdit(row)
    },
    [controller, hubPanel],
  )

  const value = useMemo<InventoryHubContextValue>(
    () => ({
      openInventoryHub: openStarting,
      openForView: openInventoryView,
      openForAdjustmentEdit,
    }),
    [openStarting, openInventoryView, openForAdjustmentEdit],
  )

  return (
    <InventoryHubContext.Provider value={value}>
      {children}
      <HubSidePanelShell open={open} onClose={handleClose} title="Inventory hub">
        <InventoryHubStartingBody controller={controller} />
      </HubSidePanelShell>
      <InventoryHubSidePanel controller={hubPanel} onBackToStarting={openStarting} />
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
