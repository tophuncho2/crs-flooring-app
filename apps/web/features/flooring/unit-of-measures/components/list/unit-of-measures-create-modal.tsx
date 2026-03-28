"use client"

import { RecordFormField, RecordModalShell } from "@/features/flooring/shared/forms/record-form"
import { FormStatusNotices } from "@/features/dashboard/shared/feedback/notices"
import { RecordPanelFooter } from "@/features/dashboard/shared/record-view/shell/record-panel-footer"

export function UnitOfMeasuresCreateModal({
  name,
  message,
  error,
  isSaving,
  onClose,
  onNameChange,
  onCreate,
}: {
  name: string
  message: string
  error: string
  isSaving: boolean
  onClose: () => void
  onNameChange: (value: string) => void
  onCreate: () => void
}) {
  return (
    <RecordModalShell title="Create Unit Of Measure" onClose={onClose} sizeClass="max-w-2xl">
      <div className="space-y-6">
        <FormStatusNotices message={message} error={error} loadingMessage={isSaving ? "Creating unit of measure..." : ""} />
        <RecordFormField label="Unit Of Measure">
          <input
            value={name}
            onChange={(event) => onNameChange(event.target.value)}
            className="rounded border border-[var(--panel-border)] bg-transparent px-3 py-2"
          />
        </RecordFormField>
        <RecordPanelFooter
          onClose={onClose}
          saveLabel="Create Unit Of Measure"
          savingLabel="Creating Unit Of Measure..."
          onSave={onCreate}
          isSaving={isSaving}
        />
      </div>
    </RecordModalShell>
  )
}
