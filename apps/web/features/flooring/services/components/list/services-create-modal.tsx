"use client"

import { RecordPanelFooter } from "@/features/dashboard/shared/record-view/record-panel-footer"
import { RecordFormField, RecordModalShell } from "@/features/flooring/shared/forms/record-form"
import { FormStatusNotices } from "@/features/dashboard/shared/feedback/notices"
import type { ServiceForm, UnitOption } from "../../domain/types"

export function ServicesCreateModal({
  draft,
  unitOptions,
  message,
  error,
  isSaving,
  onClose,
  onFieldChange,
  onCreate,
}: {
  draft: ServiceForm
  unitOptions: UnitOption[]
  message: string
  error: string
  isSaving: boolean
  onClose: () => void
  onFieldChange: (field: keyof ServiceForm, value: string) => void
  onCreate: () => void
}) {
  return (
    <RecordModalShell title="Create Service" onClose={onClose} sizeClass="max-w-3xl">
      <div className="space-y-6">
        <FormStatusNotices message={message} error={error} loadingMessage={isSaving ? "Creating service..." : ""} />
        <div className="grid gap-4 md:grid-cols-2">
          <RecordFormField label="Service Name">
            <input value={draft.name} onChange={(event) => onFieldChange("name", event.target.value)} className="rounded border border-[var(--panel-border)] bg-transparent px-3 py-2" />
          </RecordFormField>
          <RecordFormField label="Service Unit">
            <select value={draft.unitId} onChange={(event) => onFieldChange("unitId", event.target.value)} className="rounded border border-[var(--panel-border)] bg-transparent px-3 py-2">
              <option value="">Select unit</option>
              {unitOptions.map((option) => (
                <option key={option.id} value={option.id}>{option.name}</option>
              ))}
            </select>
          </RecordFormField>
          <RecordFormField label="Cost">
            <input value={draft.baseCost} onChange={(event) => onFieldChange("baseCost", event.target.value)} className="rounded border border-[var(--panel-border)] bg-transparent px-3 py-2" />
          </RecordFormField>
          <RecordFormField label="Notes">
            <textarea value={draft.notes} onChange={(event) => onFieldChange("notes", event.target.value)} className="min-h-[120px] rounded border border-[var(--panel-border)] bg-transparent px-3 py-2" />
          </RecordFormField>
        </div>
        <RecordPanelFooter
          onClose={onClose}
          onSave={onCreate}
          saveLabel="Create Service"
          savingLabel="Creating Service..."
          isSaving={isSaving}
        />
      </div>
    </RecordModalShell>
  )
}
