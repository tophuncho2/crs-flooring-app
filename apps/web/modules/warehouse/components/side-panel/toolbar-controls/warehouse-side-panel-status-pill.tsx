"use client"

import { SidePanelEditStatusPill } from "@/components/side-panel-edit"
import type { WarehouseSidePanelController } from "@/modules/warehouse/controllers/use-warehouse-side-panel"

/**
 * Warehouse side-panel adapter for the shared status pill primitive.
 * Reads dirty/saving state from the controller; no conflict tracking yet
 * (warehouse mutations don't surface optimistic-lock conflicts).
 */
export function WarehouseSidePanelStatusPill({
  controller,
}: {
  controller: WarehouseSidePanelController
}) {
  return (
    <SidePanelEditStatusPill
      isDirty={controller.isDirty}
      isSaving={controller.isSaving}
      hasConflict={false}
    />
  )
}
