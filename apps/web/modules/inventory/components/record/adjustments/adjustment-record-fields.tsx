"use client"

import { AdjustmentEditFormFields } from "./adjustment-edit-form-fields"
import { AdjustmentPickerStack } from "./adjustment-picker-stack"
import { InventoryFieldGrid } from "../fields"
import type { AdjustmentEditController } from "../../../controllers/record/adjustments/use-adjustment-edit-controller"
import type { AdjustmentEditRow } from "../../../controllers/record/adjustments/types"

export type AdjustmentRecordFieldsProps = {
  /** The shared adjustment state machine, already opened by the host. */
  controller: AdjustmentEditController
  mode: "create" | "edit"
  /** The saved row in edit mode; null in create mode. */
  adjustment?: AdjustmentEditRow | null
}

/**
 * The shared adjustment **form body** — the work-order picker cell stacked above
 * the editable adjustment cells, inside the shared record-view field grid. This
 * is the reusable core every create/edit surface composes: the inventory record
 * view's embedded drilldown face, the work-order create modal, and the inventory
 * create modal all render exactly these cells. Variation (locked vs. open
 * inventory selection, the surrounding chrome) lives in each host; the cells do
 * not change shape between them.
 */
export function AdjustmentRecordFields({
  controller,
  mode,
  adjustment = null,
}: AdjustmentRecordFieldsProps) {
  return (
    <InventoryFieldGrid>
      <AdjustmentPickerStack controller={controller} />
      <AdjustmentEditFormFields mode={mode} adjustment={adjustment} controller={controller} />
    </InventoryFieldGrid>
  )
}
