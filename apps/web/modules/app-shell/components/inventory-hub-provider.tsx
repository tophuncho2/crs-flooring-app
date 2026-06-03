"use client"

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  type ReactNode,
} from "react"
import { useQueryClient } from "@tanstack/react-query"
import type { InventoryDetail } from "@builders/domain"
import { InventoryHubSidePanel } from "@/modules/inventory/components/side-panel/hub"
import { useInventoryHubSidePanel } from "@/modules/inventory/controllers/inventory-hub-side-panel"
import { INVENTORY_LIST_QUERY_KEY } from "@/modules/inventory/data/list-inventory-request"
import { ADJUSTMENTS_LIST_QUERY_KEY } from "@/modules/adjustments/data/list-adjustments-request"
import type { AdjustmentPanelPatch, AdjustmentPanelRow } from "@/modules/adjustments"

export type InventoryHubContextValue = {
  /** Open the hub straight into an inventory's view (list-view row click). */
  openForView: (inventoryId: string) => void
  /** Open the hub straight into a adjustment's edit panel (adjustments ledger row). */
  openForAdjustmentEdit: (row: AdjustmentPanelRow) => void
}

const InventoryHubContext = createContext<InventoryHubContextValue | null>(null)

/**
 * Mounts one inventory hub side panel and shares its openers via context, so a
 * page has exactly one hub instance and one piece of state. The app shell mounts
 * the default (dashboard-wide) instance, which every list surface — the
 * inventory list, the adjustments ledger — drives. A record page that needs the
 * hub wired to its own snapshot (the work-orders record view) mounts a second,
 * nested instance with overrides; `useInventoryHub` resolves to the nearest
 * provider, so record-page openers drive that one.
 */
export function InventoryHubProvider({
  children,
  publishAdjustmentPatch,
  onInventoryUpdated,
}: {
  children: ReactNode
  /**
   * After-adjustment-mutation consumer. Omitted by the app-wide mount (defaults
   * to invalidating the dashboard lists). The work-orders record page passes its
   * WO snapshot updater so the inline adjustments section stays in sync — the
   * hub's own engine freshness handles the inventory detail + in-hub list either
   * way.
   */
  publishAdjustmentPatch?: (patch: AdjustmentPanelPatch) => void
  /** After-inventory-save consumer. Defaults to invalidating the dashboard lists. */
  onInventoryUpdated?: (inventory: InventoryDetail) => void
}) {
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
    publishAdjustmentPatch: publishAdjustmentPatch ?? invalidateLists,
    onInventoryUpdated: onInventoryUpdated ?? invalidateLists,
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
