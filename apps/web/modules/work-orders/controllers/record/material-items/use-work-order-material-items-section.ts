"use client"

import { useCallback, useState } from "react"
import {
  createLocalRecordRowId,
  isLocalOnlyRecordRow,
} from "@/controllers/record/utils/record-row-ids"
import { useRecordScopedSectionController } from "@/controllers/record/use-record-scoped-section-controller"
import { createRecordSectionError } from "@/types/record/section-error"
import { buildDuplicatedRow } from "@/components/features/duplicate-row"
import type {
  ProductPickerOption,
  WorkOrderDetail,
  WorkOrderMaterialItemForm,
  WorkOrderMaterialItemRow,
  WorkOrderMaterialItemsDiff,
} from "@builders/domain"
import { validateWorkOrderMaterialItemForm } from "@builders/domain"
import { saveWorkOrderMaterialItemsSectionRequest } from "@/modules/work-orders/data/mutations"

export type WorkOrderMaterialItemLocal = {
  id: string
  productId: string
  quantity: string
  notes: string
  // Client-only — narrows the row's product picker to a chosen category.
  // Excluded from the diff sent on save.
  categoryFilterId: string | null
}

type LocalState = { items: WorkOrderMaterialItemLocal[] }

function toLocalItem(row: WorkOrderMaterialItemRow): WorkOrderMaterialItemLocal {
  return {
    id: row.id,
    productId: row.productId,
    quantity: row.quantity,
    notes: row.notes,
    categoryFilterId: null,
  }
}

function createLocalState(rows: WorkOrderMaterialItemRow[]): LocalState {
  return { items: rows.map(toLocalItem) }
}

function createItemsRevisionKey(rows: WorkOrderMaterialItemRow[]) {
  return JSON.stringify(
    rows.map((row) => `${row.id}:${row.productId}:${row.quantity}:${row.notes}`),
  )
}

function serverItemById(rows: WorkOrderMaterialItemRow[]) {
  const map = new Map<string, WorkOrderMaterialItemRow>()
  for (const row of rows) map.set(row.id, row)
  return map
}

function itemsDiffer(local: WorkOrderMaterialItemLocal, server: WorkOrderMaterialItemRow) {
  return (
    local.productId !== server.productId ||
    local.quantity !== server.quantity ||
    local.notes !== server.notes
  )
}

function toDiffForm(local: WorkOrderMaterialItemLocal): WorkOrderMaterialItemForm {
  return {
    productId: local.productId,
    quantity: local.quantity,
    notes: local.notes,
  }
}

function buildDiff(
  local: LocalState,
  serverRows: WorkOrderMaterialItemRow[],
): WorkOrderMaterialItemsDiff {
  const serverById = serverItemById(serverRows)
  const localIds = new Set(local.items.map((item) => item.id))

  const added = local.items
    .filter((item) => isLocalOnlyRecordRow(item.id))
    .map((item) => ({ tempId: item.id, form: toDiffForm(item) }))

  const modified: WorkOrderMaterialItemsDiff["modified"] = []
  for (const item of local.items) {
    if (isLocalOnlyRecordRow(item.id)) continue
    const serverRow = serverById.get(item.id)
    if (!serverRow) continue
    if (itemsDiffer(item, serverRow)) {
      modified.push({ id: item.id, form: toDiffForm(item) })
    }
  }

  const deleted = serverRows
    .filter((row) => !localIds.has(row.id))
    .map((row) => ({ id: row.id }))

  return { added, modified, deleted }
}

export function useWorkOrderMaterialItemsSection({
  workOrder,
  materialItems,
  productPickerOptionsByItemId,
  publishMaterialItems,
  publishWorkOrder,
}: {
  workOrder: WorkOrderDetail
  materialItems: WorkOrderMaterialItemRow[]
  productPickerOptionsByItemId: Record<string, ProductPickerOption>
  publishMaterialItems: (rows: WorkOrderMaterialItemRow[]) => void
  publishWorkOrder: (record: WorkOrderDetail) => void
}) {
  // Session-scoped record of the picker option currently shown for each row,
  // seeded from the SSR-hydrated map. Updated whenever ProductPicker fires
  // onSelectOption. Used for: parent-category trigger label, quantity unit
  // suffix, and category derivation when categoryFilterId is null.
  const [selectedProductOptionByRowId, setSelectedProductOptionByRowId] = useState<
    Record<string, ProductPickerOption>
  >(() => ({ ...productPickerOptionsByItemId }))

  const setSelectedProductOption = useCallback(
    (rowId: string, option: ProductPickerOption | null) => {
      setSelectedProductOptionByRowId((previous) => {
        if (option === null) {
          if (!(rowId in previous)) return previous
          const next = { ...previous }
          delete next[rowId]
          return next
        }
        if (previous[rowId]?.id === option.id) return previous
        return { ...previous, [rowId]: option }
      })
    },
    [],
  )

  const section = useRecordScopedSectionController<WorkOrderMaterialItemRow[], LocalState>({
    recordId: workOrder.id,
    sectionKey: "material-items",
    serverValue: materialItems,
    serverRevisionKey: createItemsRevisionKey(materialItems),
    createLocalValue: createLocalState,
    persistDraft: false,
    policy: {
      addRowPlacement: "bottom",
      childRows: "inline",
    },
    onSave: async (localValue, currentRows) => {
      for (const item of localValue.items) {
        const validationError = validateWorkOrderMaterialItemForm(toDiffForm(item))
        if (validationError) {
          throw createRecordSectionError({
            kind: "validation",
            message: validationError,
            retryable: true,
          })
        }
      }

      const diff = buildDiff(localValue, currentRows)
      const {
        workOrder: nextWorkOrder,
        materialItems: nextItems,
        tempIdMap,
      } = await saveWorkOrderMaterialItemsSectionRequest(
        workOrder.id,
        diff,
        workOrder.updatedAt,
      )

      publishWorkOrder(nextWorkOrder)
      publishMaterialItems(nextItems)

      return {
        serverValue: nextItems,
        serverRevisionKey: createItemsRevisionKey(nextItems),
        noticeMessage: "Material items saved",
        tempIdMap,
      }
    },
    onReconcile: ({ tempIdMap }) => {
      // Migrate the session-scoped picker map from optimistic clientIds (the
      // tempIds we sent up in the diff's `added[]`) to the server-stamped
      // ids returned in the save response. Without this the just-saved rows
      // would render as drafts (no selectedOption) until the page is
      // reloaded — `selectedProductOptionByRowId` is keyed by row id.
      setSelectedProductOptionByRowId((previous) => {
        let changed = false
        const next: Record<string, ProductPickerOption> = {}
        for (const [rowId, option] of Object.entries(previous)) {
          const mappedId = tempIdMap[rowId]
          if (mappedId && mappedId !== rowId) {
            next[mappedId] = option
            changed = true
          } else {
            next[rowId] = option
          }
        }
        return changed ? next : previous
      })
    },
  })

  function addItem() {
    section.setLocalValue((previous) => ({
      items: [
        ...previous.items,
        {
          id: createLocalRecordRowId("work-order-material-item"),
          productId: "",
          quantity: "",
          notes: "",
          categoryFilterId: null,
        },
      ],
    }))
    section.setError(null)
  }

  function removeItem(itemId: string) {
    section.setLocalValue((previous) => ({
      items: previous.items.filter((row) => row.id !== itemId),
    }))
    setSelectedProductOptionByRowId((previous) => {
      if (!(itemId in previous)) return previous
      const next = { ...previous }
      delete next[itemId]
      return next
    })
    section.setError(null)
  }

  function duplicateItem(sourceItemId: string) {
    const newRowId = createLocalRecordRowId("work-order-material-item")
    section.setLocalValue((previous) => {
      const source = previous.items.find((row) => row.id === sourceItemId)
      if (!source) return previous
      // Copy productId + categoryFilterId so the new row's product picker is
      // pre-filtered to the same category. Quantity + notes start blank so
      // the user has to confirm the per-row values for the new line.
      const duplicated: WorkOrderMaterialItemLocal = {
        id: newRowId,
        ...buildDuplicatedRow(
          {
            productId: source.productId,
            quantity: source.quantity,
            notes: source.notes,
            categoryFilterId: source.categoryFilterId,
          },
          {
            copy: ["productId", "categoryFilterId"],
            defaults: {
              productId: "",
              quantity: "",
              notes: "",
              categoryFilterId: null,
            },
          },
        ),
      }
      return { items: [...previous.items, duplicated] }
    })
    setSelectedProductOptionByRowId((previous) => {
      const sourceOption = previous[sourceItemId]
      if (!sourceOption) return previous
      return { ...previous, [newRowId]: sourceOption }
    })
    section.setError(null)
  }

  function changeField(
    itemId: string,
    field: keyof WorkOrderMaterialItemLocal,
    value: string,
  ) {
    section.setLocalValue((previous) => ({
      items: previous.items.map((row) =>
        row.id === itemId ? { ...row, [field]: value } : row,
      ),
    }))
    if (section.error) section.setError(null)
  }

  function changeCategoryFilter(itemId: string, categoryId: string | null) {
    section.setLocalValue((previous) => ({
      items: previous.items.map((row) => {
        if (row.id !== itemId) return row
        if (row.categoryFilterId === categoryId) return row
        // Category change clears the product picker — products are filtered
        // by category and the previously-picked one may not be in the new
        // category's set. Forces the user to re-pick.
        return { ...row, categoryFilterId: categoryId, productId: "" }
      }),
    }))
    setSelectedProductOptionByRowId((previous) => {
      if (!(itemId in previous)) return previous
      const next = { ...previous }
      delete next[itemId]
      return next
    })
  }

  return {
    ...section,
    items: section.localValue.items,
    selectedProductOptionByRowId,
    setSelectedProductOption,
    addItem,
    removeItem,
    duplicateItem,
    changeField,
    changeCategoryFilter,
  }
}
