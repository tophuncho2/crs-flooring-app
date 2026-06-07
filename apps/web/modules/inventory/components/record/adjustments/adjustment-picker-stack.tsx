"use client"

import { FieldSection, FormField } from "@/components/fields"
import { SectionCard } from "@/components/headers"
import { CellAt } from "@/components/layout-grid/cell-at"
import { WorkOrderPicker } from "@/modules/work-orders/components/picker/work-order-picker"
import type { AdjustmentEditController } from "../../../controllers/record/adjustments/use-adjustment-edit-controller"

export type AdjustmentPickerStackProps = {
  controller: AdjustmentEditController
}

/**
 * The "Work order" group of the adjustment form: an inline work-order picker
 * (relink, warehouse-scoped) plus the auto-linked material item (read-only — a
 * WO's material item is unique per product, so selecting the WO resolves it via
 * `selectWorkOrderOption`).
 *
 * Warehouse + inventory are chosen in the inventory record view's header now, so
 * the old "Source" group and the body-takeover pickers (a legacy edit-panel artifact)
 * are gone. The per-context `pickerConfig.workOrder` still decides whether the
 * WO is editable / locked / hidden.
 */
export function AdjustmentPickerStack({ controller }: AdjustmentPickerStackProps) {
  const { pickerConfig, isSaving, warehouseId, form, local } = controller
  if (!pickerConfig || pickerConfig.workOrder === "hidden") return null

  const woEditable = pickerConfig.workOrder === "editable"
  const workOrderItemLabel = local.pickedWorkOrderItemLabel
  const materialItemResolving = Boolean(form.workOrderId) && !form.workOrderItemId

  return (
    <div className="flex flex-col gap-3">
      <SectionCard title="Work order" tone="neutral">
        <FieldSection gap="0.75rem">
          <CellAt col={1} colSpan={8}>
            <FormField label="Work order">
              <WorkOrderPicker
                value={form.workOrderId}
                warehouseId={warehouseId}
                selectedLabel={local.pickedWorkOrderLabel || null}
                onChange={() => {}}
                onOptionSelected={(option) => void controller.selectWorkOrderOption(option)}
                disabled={isSaving || !woEditable}
                ariaLabel="Select work order"
              />
            </FormField>
          </CellAt>
          <CellAt col={1} colSpan={8}>
            {/* Read-only: auto-linked from the selected work order (product is
                fixed + unique per WO), so there is no picker — product name only. */}
            <FormField label="Material item">
              {!form.workOrderId ? (
                <span className="text-sm text-[var(--foreground)]/55">Select a work order</span>
              ) : materialItemResolving ? (
                <span className="text-sm text-[var(--foreground)]/55">Resolving…</span>
              ) : (
                <span className="truncate text-sm text-[var(--foreground)]">
                  {workOrderItemLabel}
                </span>
              )}
            </FormField>
          </CellAt>
        </FieldSection>
      </SectionCard>
    </div>
  )
}
