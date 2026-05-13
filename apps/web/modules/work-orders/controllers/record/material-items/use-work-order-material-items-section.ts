"use client"

import { useMemo } from "react"
import {
  createLocalRecordRowId,
  isLocalOnlyRecordRow,
} from "@/controllers/record/utils/record-row-ids"
import { useRecordScopedSectionController } from "@/controllers/record/use-record-scoped-section-controller"
import { createRecordSectionError } from "@/types/record/section-error"
import { buildDuplicatedRow } from "@/components/features/duplicate-row"
import type {
  ProductOption,
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
  // Display-only snapshots seeded from the saved row's joined fields and
  // refreshed when the user picks a new product (via ProductPicker's
  // onOptionSelected). Never sent in the diff — server re-normalizes
  // from the live product table on save.
  productName: string
  sendUnitAbbrev: string
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
    productName: row.productName,
    sendUnitAbbrev: row.sendUnitAbbrev,
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

  // Local iterates newest-first (prepend on add/duplicate). Reverse so the
  // server stamps createdAt oldest → newest in submission order — keeps
  // the post-save DESC sort consistent with the user's local view.
  added.reverse()

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

function byCreatedAtDesc(
  a: WorkOrderMaterialItemRow,
  b: WorkOrderMaterialItemRow,
): number {
  return b.createdAt.localeCompare(a.createdAt)
}

export function useWorkOrderMaterialItemsSection({
  workOrder,
  materialItems,
  publishMaterialItems,
  publishWorkOrder,
}: {
  workOrder: WorkOrderDetail
  materialItems: WorkOrderMaterialItemRow[]
  publishMaterialItems: (rows: WorkOrderMaterialItemRow[]) => void
  publishWorkOrder: (record: WorkOrderDetail) => void
}) {
  // Display order: newest material item first. Sort at the controller
  // boundary so the engine + UI both see DESC-by-createdAt regardless of
  // what the API returned.
  const orderedMaterialItems = useMemo(
    () => [...materialItems].sort(byCreatedAtDesc),
    [materialItems],
  )

  const section = useRecordScopedSectionController<WorkOrderMaterialItemRow[], LocalState>({
    recordId: workOrder.id,
    sectionKey: "material-items",
    serverValue: orderedMaterialItems,
    serverRevisionKey: createItemsRevisionKey(orderedMaterialItems),
    createLocalValue: createLocalState,
    persistDraft: false,
    policy: {
      addRowPlacement: "top",
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
      const { workOrder: nextWorkOrder, materialItems: nextItems } =
        await saveWorkOrderMaterialItemsSectionRequest(
          workOrder.id,
          diff,
          workOrder.updatedAt,
        )

      const sortedNextItems = [...nextItems].sort(byCreatedAtDesc)
      publishWorkOrder(nextWorkOrder)
      publishMaterialItems(sortedNextItems)

      return {
        serverValue: sortedNextItems,
        serverRevisionKey: createItemsRevisionKey(sortedNextItems),
        noticeMessage: "Material items saved",
      }
    },
  })

  function addItem() {
    section.setLocalValue((previous) => ({
      items: [
        {
          id: createLocalRecordRowId("work-order-material-item"),
          productId: "",
          productName: "",
          sendUnitAbbrev: "",
          quantity: "",
          notes: "",
          categoryFilterId: null,
        },
        ...previous.items,
      ],
    }))
    section.setError(null)
  }

  function removeItem(itemId: string) {
    section.setLocalValue((previous) => ({
      items: previous.items.filter((row) => row.id !== itemId),
    }))
    section.setError(null)
  }

  function duplicateItem(sourceItemId: string) {
    section.setLocalValue((previous) => {
      const source = previous.items.find((row) => row.id === sourceItemId)
      if (!source) return previous
      // Copy productId + productName + sendUnitAbbrev + categoryFilterId so
      // the new row's picker shows the same product (with label) and the
      // unit-abbrev display is preserved. Quantity + notes start blank so
      // the user confirms per-row values for the new line.
      const duplicated: WorkOrderMaterialItemLocal = {
        id: createLocalRecordRowId("work-order-material-item"),
        ...buildDuplicatedRow(
          {
            productId: source.productId,
            productName: source.productName,
            sendUnitAbbrev: source.sendUnitAbbrev,
            quantity: source.quantity,
            notes: source.notes,
            categoryFilterId: source.categoryFilterId,
          },
          {
            copy: ["productId", "productName", "sendUnitAbbrev", "categoryFilterId"],
            defaults: {
              productId: "",
              productName: "",
              sendUnitAbbrev: "",
              quantity: "",
              notes: "",
              categoryFilterId: null,
            },
          },
        ),
      }
      return { items: [duplicated, ...previous.items] }
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
        // Filter-only cascade — narrowing the product picker's results
        // never clears the saved product. User picks a different product
        // explicitly if they want to change it.
        return { ...row, categoryFilterId: categoryId }
      }),
    }))
  }

  function setProductSnapshot(itemId: string, option: ProductOption | null) {
    section.setLocalValue((previous) => ({
      items: previous.items.map((row) => {
        if (row.id !== itemId) return row
        if (option === null) {
          return { ...row, productName: "", sendUnitAbbrev: "" }
        }
        return {
          ...row,
          productName: option.name,
          sendUnitAbbrev: option.sendUnitAbbrev,
        }
      }),
    }))
  }

  return {
    ...section,
    items: section.localValue.items,
    addItem,
    removeItem,
    duplicateItem,
    changeField,
    changeCategoryFilter,
    setProductSnapshot,
  }
}
