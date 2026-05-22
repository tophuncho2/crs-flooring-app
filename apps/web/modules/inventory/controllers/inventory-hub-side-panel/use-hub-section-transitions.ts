"use client"

import { useCallback, type Dispatch, type SetStateAction } from "react"
import {
  toInventoryForm,
  type InventoryCutLogRow,
  type InventoryRow,
} from "@builders/domain"
import type { CutLogEditPanelController } from "@/modules/cut-logs"
import { toCutLogPanelRow } from "./to-cut-log-panel-row"
import type { HubInventoryEditSlice } from "./use-hub-inventory-edit"
import type { HubMode } from "./types"

export type UseHubSectionTransitionsArgs = {
  contextInventoryId: string | null
  /** Current inventory snapshot for hydration on entering inventory-edit. */
  inventory: InventoryRow | null
  setMode: Dispatch<SetStateAction<HubMode>>
  setError: (message: string | null) => void
  inventoryEdit: HubInventoryEditSlice
  cutLogPanel: CutLogEditPanelController
  resetAll: () => void
}

export type HubSectionTransitionsSlice = {
  enterInventoryEditFromContext: () => void
  enterCutLogEditFromContext: (row: InventoryCutLogRow) => void
  exitToView: () => void
}

/**
 * Transitions that fire from inside the hub panel — entering an edit
 * section from view, or popping back to view from an edit section.
 * Save-on-success transitions live in the coordinator's `save` dispatch.
 */
export function useHubSectionTransitions({
  contextInventoryId,
  inventory,
  setMode,
  setError,
  inventoryEdit,
  cutLogPanel,
  resetAll,
}: UseHubSectionTransitionsArgs): HubSectionTransitionsSlice {
  const enterInventoryEditFromContext = useCallback(() => {
    if (contextInventoryId === null) return
    if (inventory) {
      inventoryEdit.hydrateFromRow(toInventoryForm(inventory), inventory.updatedAt)
    } else {
      inventoryEdit.reset()
    }
    setError(null)
    setMode({ kind: "section-edit-inventory", inventoryId: contextInventoryId })
  }, [contextInventoryId, inventory, inventoryEdit, setError, setMode])

  const enterCutLogEditFromContext = useCallback(
    (row: InventoryCutLogRow) => {
      if (contextInventoryId === null) return
      // Hand the row to the embedded cut-log panel controller. It owns
      // form/baseline/mutations; the hub just picks the mode and lets the
      // panel handle the data flow.
      cutLogPanel.openPanel({
        mode: "edit",
        workOrderItemId: row.workOrderItemId,
        cutLog: toCutLogPanelRow(row),
      })
      setError(null)
      setMode({
        kind: "section-edit-cut-log",
        inventoryId: contextInventoryId,
        cutLogId: row.id,
      })
    },
    [contextInventoryId, cutLogPanel, setError, setMode],
  )

  const exitToView = useCallback(() => {
    if (contextInventoryId === null) {
      setMode({ kind: "closed" })
      resetAll()
      return
    }
    inventoryEdit.reset()
    cutLogPanel.close()
    setError(null)
    setMode({ kind: "view", inventoryId: contextInventoryId })
  }, [contextInventoryId, inventoryEdit, cutLogPanel, resetAll, setError, setMode])

  return {
    enterInventoryEditFromContext,
    enterCutLogEditFromContext,
    exitToView,
  }
}
