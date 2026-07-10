"use client"

import { useCallback } from "react"
import {
  buildRowDiff,
  createRecordSectionError,
  isLocalOnlyRecordRow,
  useRecordScopedSectionController,
} from "@/engines/record-view"
import {
  describeIndicatorFormIssues,
  validateIndicatorUpdateForm,
  type InventoryIndicatorRow,
  type InventoryIndicatorsSectionDiff,
  type InventoryIndicatorUpdateForm,
} from "@builders/domain"
import { saveIndicatorsSectionRequest } from "@/modules/products/data/product-indicators-request"

type IndicatorsLocalState = { items: InventoryIndicatorRow[] }

function toForm(row: InventoryIndicatorRow): InventoryIndicatorUpdateForm {
  return {
    lowStockThreshold: row.lowStockThreshold,
    internalNotes: row.internalNotes,
    isActive: row.isActive,
  }
}

// Only the editable subset marks a row dirty — the identity triple + derived
// status/on-hand are read-only display fields.
function itemsDiffer(local: InventoryIndicatorRow, server: InventoryIndicatorRow) {
  return (
    local.lowStockThreshold !== server.lowStockThreshold ||
    local.internalNotes !== server.internalNotes ||
    local.isActive !== server.isActive
  )
}

// Include `updatedAt` so an external change (create modal, concurrent edit) to
// the co-fetched rows re-seeds local state through the revision-key reconcile.
function createRevisionKey(rows: InventoryIndicatorRow[]) {
  return JSON.stringify(
    rows.map((r) => `${r.id}:${r.lowStockThreshold}:${r.internalNotes}:${r.isActive}:${r.updatedAt}`),
  )
}

export type ProductIndicatorsSectionController = ReturnType<typeof useProductIndicatorsSection>

/**
 * The product record-view Inventory Indicators section — an inline-editable,
 * diff-save child section (sibling of templates planned-products / WO requested
 * material). Holds the co-fetched rows as editable local state, tracks dirtiness
 * against the server baseline, and persists every edit + delete in one atomic
 * `PATCH …/indicators/section`. Create stays the modal (identity triple is
 * create-only), so there is no inline add.
 */
export function useProductIndicatorsSection({
  productId,
  serverRows,
  expectedUpdatedAt,
  syncServerRows,
}: {
  productId: string
  serverRows: InventoryIndicatorRow[]
  /** Live parent-product OCC token (from the record detail controller). */
  expectedUpdatedAt: string
  /**
   * Push the save's fresh rows back into the co-fetch query cache so the
   * controller's server prop matches its new baseline — the co-fetch analog of
   * the WO/templates `publishRecord` step (without it the stale prop would snap
   * local state back after a save).
   */
  syncServerRows: (rows: InventoryIndicatorRow[]) => void
}) {
  const section = useRecordScopedSectionController<IndicatorsLocalState, IndicatorsLocalState>({
    recordId: productId,
    sectionKey: "inventory-indicators",
    serverValue: { items: serverRows },
    serverRevisionKey: createRevisionKey(serverRows),
    createLocalValue: (server) => ({ items: server.items.map((row) => ({ ...row })) }),
    persistDraft: false,
    policy: { addRowPlacement: "bottom", childRows: "inline" },
    onSave: async (localValue, currentServer) => {
      for (const item of localValue.items) {
        const issues = validateIndicatorUpdateForm(toForm(item))
        if (issues.length > 0) {
          throw createRecordSectionError({
            kind: "validation",
            message: describeIndicatorFormIssues(issues),
            retryable: true,
          })
        }
      }

      // No inline add (create is the modal), so `added` is always empty — but
      // buildRowDiff requires the mapper.
      const { modified, deleted } = buildRowDiff({
        locals: localValue.items,
        serverRows: currentServer.items,
        getLocalId: (item) => item.id,
        isLocalOnly: isLocalOnlyRecordRow,
        differs: itemsDiffer,
        toAdded: (item) => ({ id: item.id, form: toForm(item) }),
        toModified: (item) => ({ id: item.id, form: toForm(item) }),
      })
      const diff: InventoryIndicatorsSectionDiff = { modified, deleted }

      const { indicators } = await saveIndicatorsSectionRequest(productId, diff, expectedUpdatedAt)
      syncServerRows(indicators)
      return {
        serverValue: { items: indicators },
        serverRevisionKey: createRevisionKey(indicators),
        noticeMessage: "Indicators saved",
      }
    },
  })

  const changeField = useCallback(
    (
      itemId: string,
      field: "lowStockThreshold" | "internalNotes" | "isActive",
      value: string | boolean,
    ) => {
      section.setLocalValue((previous) => ({
        items: previous.items.map((row) => {
          if (row.id !== itemId) return row
          if (field === "isActive") return { ...row, isActive: Boolean(value) }
          if (field === "lowStockThreshold") return { ...row, lowStockThreshold: String(value) }
          return { ...row, internalNotes: String(value) }
        }),
      }))
      if (section.error) section.setError(null)
    },
    [section],
  )

  const removeRow = useCallback(
    (itemId: string) => {
      section.setLocalValue((previous) => ({
        items: previous.items.filter((row) => row.id !== itemId),
      }))
      if (section.error) section.setError(null)
    },
    [section],
  )

  return {
    ...section,
    items: section.localValue.items,
    changeField,
    removeRow,
  }
}
