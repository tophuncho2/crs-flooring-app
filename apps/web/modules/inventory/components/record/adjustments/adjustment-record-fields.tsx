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
 * The shared adjustment **form body** — the reusable core every create/edit
 * surface composes: the inventory record view's embedded drilldown face, the
 * work-order create modal, and the inventory create modal.
 *
 * Two layouts, picked by mode:
 *  - **create** (the modals) — the work-order picker cell stacked above the
 *    editable cells inside one `InventoryFieldGrid`, a single narrow column.
 *  - **edit** (the embedded record-view face) — `AdjustmentEditFormFields` owns a
 *    centered `RecordColumnBreak` + `RecordSectionDivider` layout and renders its
 *    own picker cell into the left flank.
 */
export function AdjustmentRecordFields({
  controller,
  mode,
  adjustment = null,
}: AdjustmentRecordFieldsProps) {
  if (mode === "edit" && adjustment) {
    return <AdjustmentEditFormFields mode="edit" adjustment={adjustment} controller={controller} />
  }
  return (
    <InventoryFieldGrid>
      <AdjustmentPickerStack controller={controller} />
      <AdjustmentEditFormFields mode={mode} adjustment={adjustment} controller={controller} />
    </InventoryFieldGrid>
  )
}
