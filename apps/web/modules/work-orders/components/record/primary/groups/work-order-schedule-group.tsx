"use client"

import { TextareaCell } from "@/components/cells"
import { StaticFieldValue } from "@/components/fields"
import { JobTypePicker } from "@/modules/job-types/components/picker/job-type-picker"
import { WarehousePicker } from "@/modules/warehouse/components/picker/warehouse-picker"
import { WO_DESCRIPTION_MAX, type WorkOrderForm } from "@builders/domain"
import { WorkOrderScheduleCalendar } from "../schedule-calendar/work-order-schedule-calendar"
import type { WorkOrderPrimaryDetail } from "../types"
import { WorkOrderField } from "./work-order-field"
import { WorkOrderGroup } from "./work-order-group"

/**
 * Group 1: Schedule. Left column stacks Warehouse → Job Type →
 * Description, vertically centered against the calendar's height.
 * Right column is the always-visible inline mini calendar bound to
 * `scheduledFor`.
 */
export function WorkOrderScheduleGroup({
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
    <WorkOrderGroup title="Schedule">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="flex flex-col justify-center gap-3">
          <WorkOrderField label="Warehouse">
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
          </WorkOrderField>
          <WorkOrderField label="Job Type">
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
          </WorkOrderField>
          <WorkOrderField label="Description">
            <TextareaCell
              editable={editable}
              value={draft.description}
              onChange={(value) => onFieldChange("description", value)}
              maxLength={WO_DESCRIPTION_MAX}
              rows={2}
            />
          </WorkOrderField>
        </div>
        <WorkOrderField label="Scheduled For">
          <WorkOrderScheduleCalendar
            value={draft.scheduledFor}
            onChange={(value) => onFieldChange("scheduledFor", value)}
            editable={editable}
          />
        </WorkOrderField>
      </div>
    </WorkOrderGroup>
  )
}
