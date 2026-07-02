"use client"

import { useMemo } from "react"
import { useRecordScopedSectionController } from "@/engines/record-view"
import { createRecordSectionError } from "@/types/record/section-error"
import type {
  WorkOrderDetail,
  WorkOrderMaterialItemRow,
} from "@builders/domain"
import { useSaveMaterialItemsMutation } from "./mutations/use-save-material-items-mutation"
import {
  buildMaterialItemsDiff,
  byCreatedAtDesc,
  createItemsRevisionKey,
  createLocalState,
  validateMaterialItemsDraft,
} from "./drafts"
import { useWorkOrderMaterialItemsDrafts } from "./use-work-order-material-items-drafts"
import type { WorkOrderMaterialItemsLocalState } from "./types"

/**
 * Material-items rows slice. Owns the engine's section-controller wrap
 * + the save flow (`onSave`). CRUD callbacks live in
 * `useWorkOrderMaterialItemsDrafts`; pure helpers (diff/validation/local
 * construction) live in `./drafts`.
 */
export function useWorkOrderMaterialItemsRows({
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
  const saveMutation = useSaveMaterialItemsMutation({ workOrderId: workOrder.id })

  // Display order: newest material item first. Sort at the controller
  // boundary so the engine + UI both see DESC-by-createdAt regardless of
  // what the API returned.
  const orderedMaterialItems = useMemo(
    () => [...materialItems].sort(byCreatedAtDesc),
    [materialItems],
  )

  const section = useRecordScopedSectionController<
    WorkOrderMaterialItemRow[],
    WorkOrderMaterialItemsLocalState
  >({
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
      const validationError = validateMaterialItemsDraft(localValue.items)
      if (validationError) {
        throw createRecordSectionError({
          kind: "validation",
          message: validationError,
          retryable: true,
        })
      }

      const diff = buildMaterialItemsDiff(localValue, currentRows)
      const { workOrder: nextWorkOrder, materialItems: nextItems } =
        await saveMutation.mutateAsync({
          diff,
          revisionKey: workOrder.updatedAt,
        })

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

  const drafts = useWorkOrderMaterialItemsDrafts({ section })

  return {
    section,
    items: section.localValue.items,
    addItem: drafts.addItem,
    removeItem: drafts.removeItem,
    changeField: drafts.changeField,
    changeCategoryFilter: drafts.changeCategoryFilter,
    setProductSnapshot: drafts.setProductSnapshot,
    setUnit: drafts.setUnit,
  }
}
