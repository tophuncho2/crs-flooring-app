"use client"

import { CellAt } from "@/components/layout-grid"
import { FormField, StaticFieldValue } from "@/components/fields"
import { CheckboxCell, DateCell } from "@/components/cells"
import { JobTypePicker } from "@/modules/job-types/components/picker/job-type-picker"
import { WarehousePicker } from "@/modules/warehouse/components/picker/warehouse-picker"
import type { WorkOrderForm } from "@builders/domain"
import type { WorkOrderPrimaryDetail } from "../types"

/**
 * Row 1 of the WO primary section: Warehouse, Job Type, Scheduled For,
 * Complete. Renders inside a parent `FieldSection`.
 */
export function WorkOrderMetaFieldsBand({
  editable,
  draft,
  detail,
  onFieldChange,
}: {
  editable: boolean
  draft: WorkOrderForm
  detail: WorkOrderPrimaryDetail | null
  onFieldChange: <K extends keyof WorkOrderForm>(field: K, value: WorkOrderForm[K]) => void
}) {
  return (
    <>
      <CellAt col={1} row={1} colSpan={2}>
        <FormField label="Warehouse">
          {editable ? (
            <WarehousePicker
              value={draft.warehouseId || null}
              onChange={(id) => onFieldChange("warehouseId", id ?? "")}
              selectedLabel={detail?.warehouseName || null}
              placeholder="Select warehouse"
              ariaLabel="Warehouse"
            />
          ) : (
            <StaticFieldValue>{detail?.warehouseName || "—"}</StaticFieldValue>
          )}
        </FormField>
      </CellAt>
      <CellAt col={3} row={1} colSpan={2}>
        <FormField label="Job Type">
          {editable ? (
            <JobTypePicker
              value={draft.jobTypeId || null}
              onChange={(id) => onFieldChange("jobTypeId", id ?? "")}
              selectedLabel={detail?.jobTypeName ?? null}
              placeholder="—"
              ariaLabel="Job type"
            />
          ) : (
            <StaticFieldValue>{detail?.jobTypeName ?? "—"}</StaticFieldValue>
          )}
        </FormField>
      </CellAt>
      <CellAt col={5} row={1} colSpan={1}>
        <FormField label="Scheduled For">
          <DateCell
            editable={editable}
            value={draft.scheduledFor}
            onChange={(value) => onFieldChange("scheduledFor", value)}
          />
        </FormField>
      </CellAt>
      <CellAt col={7} row={1} colSpan={1}>
        <FormField label="Complete">
          <CheckboxCell
            editable={editable}
            value={draft.isComplete}
            onChange={(value) => onFieldChange("isComplete", value)}
          />
        </FormField>
      </CellAt>
    </>
  )
}
