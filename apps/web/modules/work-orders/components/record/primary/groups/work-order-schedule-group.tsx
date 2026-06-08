"use client"

import { useState } from "react"
import { DateCell, SegmentedChoiceCell, TextCell } from "@/engines/record-view"
import { StaticFieldValue } from "@/engines/record-view"
import { JobTypePicker } from "@/modules/job-types/components/picker/job-type-picker"
import { WarehousePicker } from "@/modules/warehouse/components/picker/warehouse-picker"
import { WO_DESCRIPTION_MAX, type WorkOrderForm } from "@builders/domain"
import { TIME_OF_DAY_OPTIONS } from "../helpers"
import type { WorkOrderPrimaryDetail } from "../types"
import { WorkOrderField } from "./work-order-field"
import { WorkOrderGroup } from "./work-order-group"

/**
 * Group 1: Schedule. Stacks Warehouse → Scheduled For → Job Type →
 * Description.
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
  // Local label snapshots so the picker triggers show the just-picked name
  // immediately, before the section save reconciles a fresh `detail`. Each
  // resets at render time when its bound detail id changes (previous-value
  // tracking) so the next record's saved name shows without a post-commit
  // effect — mirrors the MC/Property pickers in WorkOrderPropertyUnitGroup.
  const [pickedWarehouseLabel, setPickedWarehouseLabel] = useState<string | null>(null)
  const [trackedWarehouseId, setTrackedWarehouseId] = useState(detail?.warehouseId)
  if (trackedWarehouseId !== detail?.warehouseId) {
    setTrackedWarehouseId(detail?.warehouseId)
    setPickedWarehouseLabel(null)
  }

  const [pickedJobTypeLabel, setPickedJobTypeLabel] = useState<string | null>(null)
  const [trackedJobTypeId, setTrackedJobTypeId] = useState(detail?.jobTypeId)
  if (trackedJobTypeId !== detail?.jobTypeId) {
    setTrackedJobTypeId(detail?.jobTypeId)
    setPickedJobTypeLabel(null)
  }

  const warehouseLabel = pickedWarehouseLabel ?? detail?.warehouseName ?? null
  const jobTypeLabel = pickedJobTypeLabel ?? detail?.jobTypeName ?? null

  return (
    <WorkOrderGroup title="Schedule">
      <div className="flex flex-col gap-3">
        <div className="flex items-start gap-3">
          <WorkOrderField label="Warehouse" className="flex-1">
            {editable ? (
              <WarehousePicker
                value={draft.warehouseId || null}
                onChange={(id) => onFieldChange("warehouseId", id ?? "")}
                onOptionSelected={(option) => setPickedWarehouseLabel(option?.name ?? null)}
                selectedLabel={warehouseLabel}
                placeholder="Select warehouse"
                ariaLabel="Warehouse"
              />
            ) : (
              <StaticFieldValue>{warehouseLabel || "—"}</StaticFieldValue>
            )}
          </WorkOrderField>
          <WorkOrderField label="Job Type" className="flex-1">
            {editable ? (
              <JobTypePicker
                value={draft.jobTypeId || null}
                onChange={(id) => onFieldChange("jobTypeId", id ?? "")}
                onOptionSelected={(option) => setPickedJobTypeLabel(option?.name ?? null)}
                selectedLabel={jobTypeLabel}
                placeholder="—"
                ariaLabel="Job type"
              />
            ) : (
              <StaticFieldValue>{jobTypeLabel ?? "—"}</StaticFieldValue>
            )}
          </WorkOrderField>
          <WorkOrderField label="Scheduled For" className="flex-1">
            <DateCell
              editable={editable}
              value={draft.scheduledFor}
              onChange={(value) => onFieldChange("scheduledFor", value)}
            />
          </WorkOrderField>
          <WorkOrderField label="Time of Day" className="w-44 shrink-0">
            <SegmentedChoiceCell
              editable={editable}
              value={draft.timeOfDay}
              options={TIME_OF_DAY_OPTIONS}
              ariaLabel="Time of Day"
              onChange={(value) =>
                onFieldChange("timeOfDay", value as WorkOrderForm["timeOfDay"])
              }
            />
          </WorkOrderField>
        </div>
        <WorkOrderField
          label="Description"
          editable={editable}
          currentLength={draft.description.length}
          maxLength={WO_DESCRIPTION_MAX}
        >
          <TextCell
            editable={editable}
            value={draft.description}
            onChange={(value) => onFieldChange("description", value)}
            maxLength={WO_DESCRIPTION_MAX}
          />
        </WorkOrderField>
      </div>
    </WorkOrderGroup>
  )
}
