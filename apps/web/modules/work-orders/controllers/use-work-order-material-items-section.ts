"use client"

import { useRouter } from "next/navigation"
import {
  createLocalRecordRowId,
  isLocalOnlyRecordRow,
} from "@/controllers/record/utils/record-row-ids"
import { useRecordScopedSectionController } from "@/controllers/record/use-record-scoped-section-controller"
import { createRecordSectionError } from "@/types/record/section-error"
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
  const router = useRouter()
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
      const { workOrder: nextWorkOrder } = await saveWorkOrderMaterialItemsSectionRequest(
        workOrder.id,
        diff,
        workOrder.updatedAt,
      )
      // The server response contains the WO detail (which now includes the
      // updated material items via the read shape). Publish both for the
      // parent panel state to reconcile.
      publishWorkOrder(nextWorkOrder)
      void publishMaterialItems
      // The save response carries the WO detail but not the materialItems
      // payload; router.refresh() re-runs the SSR loader so the panel
      // re-seeds initialMaterialItems and the controller reconciles via
      // serverRevisionKey change. Tracked under 2d as a candidate for
      // a cleaner "save returns items" route extension.
      router.refresh()
      return {
        serverValue: currentRows,
        serverRevisionKey: createItemsRevisionKey(currentRows),
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
      items: previous.items.map((row) =>
        row.id === itemId ? { ...row, categoryFilterId: categoryId } : row,
      ),
    }))
  }

  return {
    ...section,
    items: section.localValue.items,
    addItem,
    removeItem,
    changeField,
    changeCategoryFilter,
  }
}
