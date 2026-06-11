"use client"

import { CellAt, FormField } from "@/engines/record-view"
import { WorkOrderPicker } from "@/modules/work-orders/components/picker/work-order-picker"
import type { AdjustmentEditController } from "../../../controllers/record/adjustments/use-adjustment-edit-controller"

export type AdjustmentPickerStackProps = {
  controller: AdjustmentEditController
}

/**
 * The work-order cells of the adjustment form: an inline work-order picker
 * (relink, not warehouse-scoped — adjustments cross-source across warehouses)
 * plus the auto-linked material item (read-only — a WO's material item is unique
 * per product, so selecting the WO resolves it via `selectWorkOrderOption`).
 *
 * Renders bare `<CellAt>` cells (Work order, then Material item beneath it) for
 * the shared record-view field grid supplied by the host — no group chrome.
 * Returns `null` when the per-context `pickerConfig.workOrder` is `hidden`;
 * `editable` / `locked` decide whether the WO picker is interactive.
 */
export function AdjustmentPickerStack({ controller }: AdjustmentPickerStackProps) {
  const { pickerConfig, isSaving, productId, form, local } = controller
  if (!pickerConfig || pickerConfig.workOrder === "hidden") return null

  const woEditable = pickerConfig.workOrder === "editable"
  const workOrderItemLabel = local.pickedWorkOrderItemLabel
  const materialItemResolving = Boolean(form.workOrderId) && !form.workOrderItemId

  return (
    <>
      <CellAt col={1} colSpan={4}>
        <FormField label="Work order">
          <WorkOrderPicker
            value={form.workOrderId}
            productId={productId}
            selectedLabel={local.pickedWorkOrderLabel || null}
            onChange={() => {}}
            onOptionSelected={(option) => void controller.selectWorkOrderOption(option)}
            disabled={isSaving || !woEditable}
            ariaLabel="Select work order"
          />
        </FormField>
      </CellAt>
      {/* Read-only: auto-linked from the selected work order (product is fixed +
          unique per WO), so there is no picker — product name only. */}
      <CellAt col={1} colSpan={4}>
        <FormField label="Material item">
          {!form.workOrderId ? (
            <span className="text-sm text-[var(--foreground)]/55">Select a work order</span>
          ) : materialItemResolving ? (
            <span className="text-sm text-[var(--foreground)]/55">Resolving…</span>
          ) : (
            <span className="truncate text-sm text-[var(--foreground)]">{workOrderItemLabel}</span>
          )}
        </FormField>
      </CellAt>
    </>
  )
}
