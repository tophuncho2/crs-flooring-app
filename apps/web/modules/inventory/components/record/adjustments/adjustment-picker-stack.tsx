"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { CellAt, FormField, RecordOpenButton } from "@/engines/record-view"
import { buildCurrentRecordEntryPath, buildRecordDetailHref } from "@/hooks/navigation"
import { WorkOrderPicker } from "@/modules/work-orders/components/picker/work-order-picker"
import type { AdjustmentEditController } from "../../../controllers/record/adjustments/use-adjustment-edit-controller"

export type AdjustmentPickerStackProps = {
  controller: AdjustmentEditController
}

/**
 * The work-order cell of the adjustment form: an inline work-order picker
 * (relink, not warehouse-scoped — adjustments cross-source across warehouses,
 * and link to any work order regardless of product).
 *
 * Renders a bare `<CellAt>` cell (Work order) for the shared record-view field
 * grid supplied by the host — no group chrome. Returns `null` when the
 * per-context `pickerConfig.workOrder` is `hidden`; `editable` / `locked`
 * decide whether the WO picker is interactive.
 */
export function AdjustmentPickerStack({ controller }: AdjustmentPickerStackProps) {
  const { pickerConfig, isSaving, form, local } = controller
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  if (!pickerConfig || pickerConfig.workOrder === "hidden") return null

  const woEditable = pickerConfig.workOrder === "editable"
  const returnTo = buildCurrentRecordEntryPath(pathname, searchParams)

  return (
    <CellAt col={1} colSpan={4}>
      <FormField
        label="Work order"
        actions={
          <RecordOpenButton
            ariaLabel="Open work order"
            title="Open work order"
            disabled={!form.workOrderId}
            onClick={() => {
              if (form.workOrderId) {
                router.push(buildRecordDetailHref("/dashboard/work-orders", form.workOrderId, returnTo))
              }
            }}
          />
        }
      >
        <WorkOrderPicker
          value={form.workOrderId}
          selectedLabel={local.pickedWorkOrderLabel || null}
          onChange={() => {}}
          onOptionSelected={(option) => controller.selectWorkOrderOption(option)}
          disabled={isSaving || !woEditable}
          ariaLabel="Select work order"
        />
      </FormField>
    </CellAt>
  )
}
