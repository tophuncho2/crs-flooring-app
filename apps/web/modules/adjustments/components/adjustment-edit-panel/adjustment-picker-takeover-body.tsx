"use client"

import type { AdjustmentEditPanelController } from "@/modules/adjustments/controllers/adjustment-side-panel"
import { AdjustmentInventoryPickerTakeover } from "./pickers/adjustment-inventory-picker-takeover"
import { AdjustmentLocationPickerTakeover } from "./pickers/adjustment-location-picker-takeover"
import { AdjustmentWarehousePickerTakeover } from "./pickers/adjustment-warehouse-picker-takeover"
import { AdjustmentWorkOrderPickerTakeover } from "./pickers/adjustment-work-order-picker-takeover"

/**
 * Renders the active body-takeover picker for whichever `pickerKind` the
 * controller has open. Shared by both surfaces — the standalone WO panel and
 * the inventory hub mount this in their body while a picker is active.
 */
export function AdjustmentPickerTakeoverBody({
  controller,
}: {
  controller: AdjustmentEditPanelController
}) {
  switch (controller.pickerKind) {
    case "warehouse":
      return <AdjustmentWarehousePickerTakeover controller={controller} />
    case "inventory":
      return <AdjustmentInventoryPickerTakeover controller={controller} />
    case "location":
      return <AdjustmentLocationPickerTakeover controller={controller} />
    case "workOrder":
      return <AdjustmentWorkOrderPickerTakeover controller={controller} />
    default:
      return null
  }
}
