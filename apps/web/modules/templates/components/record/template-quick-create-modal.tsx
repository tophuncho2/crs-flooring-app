"use client"

import { useState } from "react"
import { FormField, QuickCreateModal, TextCell, TextareaCell } from "@/engines/record-view"
import {
  TEMPLATE_DESCRIPTION_MAX,
  TEMPLATE_UNIT_TYPE_MAX,
  type TemplateForm,
  type TemplateOption,
} from "@builders/domain"
import { JobTypePicker } from "@/modules/job-types/components/picker/job-type-picker"
import { WarehousePicker } from "@/modules/warehouse/components/picker/warehouse-picker"
import { useTemplateQuickCreate } from "@/modules/templates/controllers/record/use-template-quick-create"

/**
 * The template **quick create** form mounted in a modal inside a record view —
 * the lean counterpart to the full `/dashboard/templates/new` page. Renders the
 * core editable fields (Unit Type required + Job Type / Warehouse / Description)
 * over the shared `QuickCreateModal` engine chrome, auto-links the new template to
 * the host's current property (shown read-only), creates via `/api/templates`,
 * then hands the created template back as a `TemplateOption` through `onCreated`
 * so the host fills the originating cell — no navigation.
 *
 * Mount it conditionally (only while open) so each open starts from a clean
 * controller + picker-label snapshots.
 */
export function TemplateQuickCreateModal({
  open,
  onClose,
  onCreated,
  initialProperty,
}: {
  open: boolean
  onClose: () => void
  onCreated: (option: TemplateOption) => void
  /** The host's current property — the new template is scoped to it (optional). */
  initialProperty?: { id: string; label: string | null } | null
}) {
  const controller = useTemplateQuickCreate({ initialPropertyId: initialProperty?.id ?? null })
  const editable = !controller.isSaving

  const [jobTypeLabel, setJobTypeLabel] = useState<string | null>(null)
  const [warehouseLabel, setWarehouseLabel] = useState<string | null>(null)

  const { localValue } = controller
  const setField = (field: keyof TemplateForm, value: string) =>
    controller.setLocalValue((prev) => ({ ...prev, [field]: value }))

  async function handleCreate() {
    const result = await controller.save()
    if (result?.template) {
      const t = result.template
      onCreated({
        id: t.id,
        unitType: t.unitType,
        jobTypeName: t.jobTypeName,
        description: t.description,
        itemsCount: t.itemsCount,
      })
    }
  }

  return (
    <QuickCreateModal
      open={open}
      title="New Template"
      onClose={onClose}
      onCreate={() => void handleCreate()}
      canCreate={controller.canCreate}
      isSaving={controller.isSaving}
      error={controller.error}
    >
      <div className="space-y-4">
        <p className="text-sm text-[var(--foreground)]/70">
          For property:{" "}
          <span className="font-medium text-[var(--foreground)]">
            {initialProperty?.label ?? "No property"}
          </span>
        </p>

        <FormField
          label="Unit Type"
          required
          currentLength={editable ? localValue.unitType.length : undefined}
          maxLength={editable ? TEMPLATE_UNIT_TYPE_MAX : undefined}
        >
          <TextCell
            editable={editable}
            value={localValue.unitType}
            onChange={(value) => setField("unitType", value)}
            maxLength={TEMPLATE_UNIT_TYPE_MAX}
          />
        </FormField>

        <FormField label="Job Type">
          <JobTypePicker
            value={localValue.jobTypeId || null}
            onChange={(id) => setField("jobTypeId", id ?? "")}
            onOptionSelected={(option) => setJobTypeLabel(option?.name ?? null)}
            selectedLabel={jobTypeLabel}
            placeholder="No job type"
            ariaLabel="Job type"
            disabled={!editable}
          />
        </FormField>

        <FormField label="Warehouse">
          <WarehousePicker
            value={localValue.warehouseId || null}
            onChange={(id) => setField("warehouseId", id ?? "")}
            onOptionSelected={(option) => setWarehouseLabel(option?.name ?? null)}
            selectedLabel={warehouseLabel}
            placeholder="No warehouse"
            ariaLabel="Warehouse"
            disabled={!editable}
          />
        </FormField>

        <FormField
          label="Description"
          currentLength={editable ? localValue.description.length : undefined}
          maxLength={editable ? TEMPLATE_DESCRIPTION_MAX : undefined}
        >
          <TextareaCell
            editable={editable}
            value={localValue.description}
            onChange={(value) => setField("description", value)}
            maxLength={TEMPLATE_DESCRIPTION_MAX}
            rows={2}
          />
        </FormField>
      </div>
    </QuickCreateModal>
  )
}
