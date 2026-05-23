"use client"

import { useCallback, useState } from "react"
import { Pencil } from "lucide-react"
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
 * Header carries a pencil "Job type" button (edits the currently
 * selected job type by id) and a "+ Add job type" button (create). Both
 * open the shared job-type side panel.
 *
 * `pickedJobTypeLabel` is the picker trigger's label snapshot. The
 * dropdown's `selectedOption` takes precedence over its live results, so
 * the snapshot must track every selection source: create (`onCreated`),
 * rename (`onUpdated`), and manual picks (`onOptionSelected`). Delete
 * (`onDeleted`) clears the now-dangling selection so the pencil disables
 * and the deleted id isn't re-fetched. Rename also fires `onJobTypeRenamed`
 * so the host patches its record cell. Mirrors the "+ New property" flow.
 */
export function TemplateJobGroup({
  editable,
  draft,
  detail,
  onFieldChange,
  onJobTypeRenamed,
}: {
  editable: boolean
  draft: TemplateForm
  detail: TemplatePrimaryDetail | null
  onFieldChange: (field: keyof TemplateForm, value: string) => void
  /**
   * Fires when the user renames a job type via the pencil/edit panel.
   * The host record-view patches its locally-held `jobTypeName` so the
   * cell reflects the new name without a refetch (identity-gated host-side).
   */
  onJobTypeRenamed?: (jobType: JobType) => void
}) {
  const [pickedJobTypeLabel, setPickedJobTypeLabel] = useState<string | null>(null)

  const handleJobTypeCreated = useCallback(
    (jobType: JobType) => {
      onFieldChange("jobTypeId", jobType.id)
      setPickedJobTypeLabel(jobType.name)
    },
    [onFieldChange],
  )

  const handleJobTypeUpdated = useCallback(
    (jobType: JobType) => {
      setPickedJobTypeLabel(jobType.name)
      onJobTypeRenamed?.(jobType)
    },
    [onJobTypeRenamed],
  )

  const handleJobTypeDeleted = useCallback(
    (id: string) => {
      if (draft.jobTypeId !== id) return
      onFieldChange("jobTypeId", "")
      setPickedJobTypeLabel(null)
    },
    [draft.jobTypeId, onFieldChange],
  )

  const jobTypePanel = useJobTypeSidePanel({
    onCreated: handleJobTypeCreated,
    onUpdated: handleJobTypeUpdated,
    onDeleted: handleJobTypeDeleted,
  })

  const jobTypeValue = draft.jobTypeId || null
  const jobTypeLabel = pickedJobTypeLabel ?? detail?.jobTypeName ?? null

  return (
    <TemplateGroup
      title="Job"
      headerRight={
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label="Edit job type"
            title="Edit job type"
            onClick={() => {
              if (jobTypeValue) {
                void jobTypePanel.openForEditById(jobTypeValue)
              }
            }}
            disabled={!jobTypeValue}
            className={GROUP_HEADER_BUTTON_CLASS}
          >
            <Pencil size={12} className="mr-1" /> Job type
          </button>
          {editable ? (
            <button
              type="button"
              aria-label="Add job type"
              onClick={jobTypePanel.openForCreate}
              className={GROUP_HEADER_BUTTON_CLASS}
            >
              + Add job type
            </button>
          ) : null}
        </div>
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
                onOptionSelected={(option) => setPickedJobTypeLabel(option?.name ?? null)}
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
