"use client"

import { useCallback, useState } from "react"
import { TextCell } from "@/components/cells"
import { StaticFieldValue } from "@/components/fields"
import { JobTypeSidePanel } from "@/modules/job-types/components/side-panel/job-type-side-panel"
import { JobTypePicker } from "@/modules/job-types/components/picker/job-type-picker"
import { useJobTypeSidePanel } from "@/modules/job-types/controllers/side-panel"
import { WarehousePicker } from "@/modules/warehouse/components/picker/warehouse-picker"
import { TEMPLATE_DESCRIPTION_MAX, type JobType, type TemplateForm } from "@builders/domain"
import type { TemplatePrimaryDetail } from "../template-primary-fields-section"
import { TemplateField } from "./template-field"
import { GROUP_HEADER_BUTTON_CLASS, TemplateGroup } from "./template-group"

/**
 * Group 1: Job. Left column stacks Warehouse → Job Type → Description.
 * Right column is intentionally empty for visual breathing room
 * (mirrors WO's Schedule group). Templates have no Scheduled For, so
 * "Job" rather than "Schedule".
 *
 * Header carries a "+ Add job type" button that opens the shared
 * job-type side panel in create mode; on create the new job type is
 * auto-selected into the picker. `pickedJobTypeLabel` seeds the picker
 * trigger with the new name until the saved record carries it (mirrors
 * the "+ New property" flow in the Property & Unit group). No reset
 * effect is needed: the picker ignores `selectedLabel` when the value
 * is cleared and prefers live search results otherwise, and the snapshot
 * naturally aligns with the saved detail.
 */
export function TemplateJobGroup({
  editable,
  draft,
  detail,
  onFieldChange,
}: {
  editable: boolean
  draft: TemplateForm
  detail: TemplatePrimaryDetail | null
  onFieldChange: (field: keyof TemplateForm, value: string) => void
}) {
  const [pickedJobTypeLabel, setPickedJobTypeLabel] = useState<string | null>(null)

  const handleJobTypeCreated = useCallback(
    (jobType: JobType) => {
      onFieldChange("jobTypeId", jobType.id)
      setPickedJobTypeLabel(jobType.name)
    },
    [onFieldChange],
  )

  const jobTypePanel = useJobTypeSidePanel({ onCreated: handleJobTypeCreated })

  const jobTypeLabel = pickedJobTypeLabel ?? detail?.jobTypeName ?? null

  return (
    <TemplateGroup
      title="Job"
      headerRight={
        editable ? (
          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-label="Add job type"
              onClick={jobTypePanel.openForCreate}
              className={GROUP_HEADER_BUTTON_CLASS}
            >
              + Add job type
            </button>
          </div>
        ) : null
      }
    >
      <JobTypeSidePanel controller={jobTypePanel} />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="flex flex-col gap-3">
          <TemplateField label="Warehouse">
            {editable ? (
              <WarehousePicker
                value={draft.warehouseId || null}
                onChange={(id) => onFieldChange("warehouseId", id ?? "")}
                selectedLabel={detail?.warehouseName || null}
                placeholder="No warehouse"
                ariaLabel="Warehouse"
              />
            ) : (
              <StaticFieldValue>{detail?.warehouseName || "—"}</StaticFieldValue>
            )}
          </TemplateField>
          <TemplateField label="Job Type">
            {editable ? (
              <JobTypePicker
                value={draft.jobTypeId || null}
                onChange={(id) => onFieldChange("jobTypeId", id ?? "")}
                selectedLabel={jobTypeLabel}
                placeholder="No job type"
                ariaLabel="Job type"
              />
            ) : (
              <StaticFieldValue>{jobTypeLabel ?? "—"}</StaticFieldValue>
            )}
          </TemplateField>
          <TemplateField
            label="Description"
            editable={editable}
            currentLength={draft.description.length}
            maxLength={TEMPLATE_DESCRIPTION_MAX}
          >
            <TextCell
              editable={editable}
              value={draft.description}
              onChange={(value) => onFieldChange("description", value)}
              maxLength={TEMPLATE_DESCRIPTION_MAX}
            />
          </TemplateField>
        </div>
        <div />
      </div>
    </TemplateGroup>
  )
}
