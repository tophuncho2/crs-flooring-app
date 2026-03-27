"use client"

import { RecordPanelFooter } from "@/features/dashboard/shared/record-view/record-panel-footer"
import { RecordFormField, RecordModalShell } from "@/features/flooring/shared/forms/record-form"
import { FormStatusNotices } from "@/features/dashboard/shared/feedback/notices"
import type { ManufacturerForm } from "../../domain/types"

export function ManufacturersCreateModal({
  draft,
  message,
  error,
  isSaving,
  onClose,
  onFieldChange,
  onCreate,
}: {
  draft: ManufacturerForm
  message: string
  error: string
  isSaving: boolean
  onClose: () => void
  onFieldChange: (field: keyof ManufacturerForm, value: string) => void
  onCreate: () => void
}) {
  return (
    <RecordModalShell title="Create Manufacturer" onClose={onClose} sizeClass="max-w-3xl">
      <div className="space-y-6">
        <FormStatusNotices message={message} error={error} loadingMessage={isSaving ? "Creating manufacturer..." : ""} />
        <div className="grid gap-4 md:grid-cols-2">
          <RecordFormField label="Company Name">
            <input value={draft.companyName} onChange={(event) => onFieldChange("companyName", event.target.value)} className="rounded border border-[var(--panel-border)] bg-transparent px-3 py-2" />
          </RecordFormField>
          <RecordFormField label="Agent Name">
            <input value={draft.agentName} onChange={(event) => onFieldChange("agentName", event.target.value)} className="rounded border border-[var(--panel-border)] bg-transparent px-3 py-2" />
          </RecordFormField>
          <RecordFormField label="Website">
            <input value={draft.website} onChange={(event) => onFieldChange("website", event.target.value)} className="rounded border border-[var(--panel-border)] bg-transparent px-3 py-2" />
          </RecordFormField>
          <RecordFormField label="Phone">
            <input value={draft.phone} onChange={(event) => onFieldChange("phone", event.target.value)} className="rounded border border-[var(--panel-border)] bg-transparent px-3 py-2" />
          </RecordFormField>
          <RecordFormField label="Email">
            <input value={draft.email} onChange={(event) => onFieldChange("email", event.target.value)} className="rounded border border-[var(--panel-border)] bg-transparent px-3 py-2" />
          </RecordFormField>
        </div>
        <RecordPanelFooter
          onClose={onClose}
          onSave={onCreate}
          saveLabel="Create Manufacturer"
          savingLabel="Creating Manufacturer..."
          isSaving={isSaving}
        />
      </div>
    </RecordModalShell>
  )
}
