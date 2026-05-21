"use client"

import { TextCell } from "@/components/cells"
import { StaticFieldValue } from "@/components/fields"
import { JobTypePicker } from "@/modules/job-types/components/picker/job-type-picker"
import { WarehousePicker } from "@/modules/warehouse/components/picker/warehouse-picker"
import { TEMPLATE_DESCRIPTION_MAX, type TemplateForm } from "@builders/domain"
import type { TemplatePrimaryDetail } from "../template-primary-fields-section"
import { TemplateField } from "./template-field"
import { TemplateGroup } from "./template-group"

/**
 * Group 1: Job. Left column stacks Warehouse → Job Type → Description.
 * Right column is intentionally empty for visual breathing room
 * (mirrors WO's Schedule group). Templates have no Scheduled For, so
 * "Job" rather than "Schedule".
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
  return (
    <TemplateGroup title="Job">
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
                selectedLabel={detail?.jobTypeName ?? null}
                placeholder="No job type"
                ariaLabel="Job type"
              />
            ) : (
              <StaticFieldValue>{detail?.jobTypeName ?? "—"}</StaticFieldValue>
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
