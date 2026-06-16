"use client"

import type {
  WorkOrderDetail,
  WorkOrderMaterialItemRow,
} from "@builders/domain"
import { useWorkOrderMaterialItemsRows } from "./use-work-order-material-items-rows"

export type { WorkOrderMaterialItemLocal } from "./types"

/**
 * Top-level work-order material-items section controller. Composes the
 * rows slice (drafts + diff save + CRUD) into the flat public surface the
 * section component consumes — no API change vs. the pre-split version.
 */
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
  const rows = useWorkOrderMaterialItemsRows({
    workOrder,
    materialItems,
    publishMaterialItems,
    publishWorkOrder,
  })

  return {
    ...rows.section,
    items: rows.items,
    addItem: rows.addItem,
    removeItem: rows.removeItem,
    changeField: rows.changeField,
    changeCategoryFilter: rows.changeCategoryFilter,
    setProductSnapshot: rows.setProductSnapshot,
  }
}

/** Public surface of the material-items section controller, lifted to the panel. */
export type WorkOrderMaterialItemsSectionController = ReturnType<
  typeof useWorkOrderMaterialItemsSection
>
