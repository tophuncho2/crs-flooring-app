"use client"

import {
  createLocalRecordRowId,
  isLocalOnlyRecordRow,
} from "@/controllers/record/utils/record-row-ids"
import { useRecordScopedSectionController } from "@/controllers/record/use-record-scoped-section-controller"
import { createRecordSectionError } from "@/types/record/section-error"
import { buildDuplicatedRow } from "@/components/features/duplicate-row"
import type {
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
  publishMaterialItems,
  publishWorkOrder,
}: {
  workOrder: WorkOrderDetail
  materialItems: WorkOrderMaterialItemRow[]
  publishMaterialItems: (rows: WorkOrderMaterialItemRow[]) => void
  publishWorkOrder: (record: WorkOrderDetail) => void
}) {
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
      const { workOrder: nextWorkOrder, materialItems: nextItems } =
        await saveWorkOrderMaterialItemsSectionRequest(
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
      }
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
    section.setError(null)
  }

  function duplicateItem(sourceItemId: string) {
    section.setLocalValue((previous) => {
      const source = previous.items.find((row) => row.id === sourceItemId)
      if (!source) return previous
      // Copy productId + categoryFilterId so the new row's product picker is
      // pre-filtered to the same category. Quantity + notes start blank so
      // the user has to confirm the per-row values for the new line.
      const duplicated: WorkOrderMaterialItemLocal = {
        id: createLocalRecordRowId("work-order-material-item"),
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
  }

  return {
    ...section,
    items: section.localValue.items,
    addItem,
    removeItem,
    duplicateItem,
    changeField,
    changeCategoryFilter,
  }
}
