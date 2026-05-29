"use client"

import { useCallback, type Dispatch, type SetStateAction } from "react"
import {
  toInventoryForm,
  type EnrichedInventoryAdjustmentRow,
  type InventoryRow,
} from "@builders/domain"
import type { RecordSectionError } from "@/types/record/section-error"
import type { AdjustmentEditPanelController } from "@/modules/adjustments"
import { toAdjustmentPanelRow } from "./to-adjustment-panel-row"
import type { HubInventoryEditSlice } from "./use-hub-inventory-edit"
import type { HubInventoryDuplicateSlice } from "./use-hub-inventory-duplicate"
import type { HubMode } from "./types"

export type UseHubSectionTransitionsArgs = {
  contextInventoryId: string | null
  /** Current inventory snapshot for hydration on entering inventory-edit. */
  inventory: InventoryRow | null
  setMode: Dispatch<SetStateAction<HubMode>>
  setError: (value: RecordSectionError | null) => void
  inventoryEdit: HubInventoryEditSlice
  inventoryDuplicate: HubInventoryDuplicateSlice
  adjustmentPanel: AdjustmentEditPanelController
  resetAll: () => void
}

export type HubSectionTransitionsSlice = {
  enterInventoryEditFromContext: () => void
  enterAdjustmentEditFromContext: (row: EnrichedInventoryAdjustmentRow) => void
  enterAdjustmentCreate: () => void
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
  inventoryDuplicate,
  adjustmentPanel,
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

  const enterAdjustmentEditFromContext = useCallback(
    (row: EnrichedInventoryAdjustmentRow) => {
      if (contextInventoryId === null) return
      // Hand the row to the embedded adjustment panel controller. It owns
      // form/baseline/mutations; the hub just picks the mode and lets the
      // panel handle the data flow.
      adjustmentPanel.openPanel({
        mode: "edit",
        workOrderItemId: row.workOrderItemId,
        adjustment: toAdjustmentPanelRow(row),
      })
      setError(null)
      setMode({
        kind: "section-edit-adjustment",
        inventoryId: contextInventoryId,
        adjustmentId: row.id,
      })
    },
    [contextInventoryId, adjustmentPanel, setError, setMode],
  )

  const enterAdjustmentCreate = useCallback(() => {
    if (contextInventoryId === null) return
    // Open the embedded panel in manual-create mode. The parent inventory is
    // the hub context; the panel form carries only direction + amount + notes.
    adjustmentPanel.openPanel({
      mode: "create",
      variant: "manual",
      inventoryId: contextInventoryId,
    })
    setError(null)
    setMode({ kind: "section-create-adjustment", inventoryId: contextInventoryId })
  }, [contextInventoryId, adjustmentPanel, setError, setMode])

  const exitToView = useCallback(() => {
    if (contextInventoryId === null) {
      setMode({ kind: "closed" })
      resetAll()
      return
    }
    inventoryEdit.reset()
    inventoryDuplicate.reset()
    adjustmentPanel.close()
    setError(null)
    setMode({ kind: "view", inventoryId: contextInventoryId })
  }, [contextInventoryId, inventoryEdit, inventoryDuplicate, adjustmentPanel, resetAll, setError, setMode])

  return {
    enterInventoryEditFromContext,
    enterAdjustmentEditFromContext,
    enterAdjustmentCreate,
    exitToView,
  }
}
