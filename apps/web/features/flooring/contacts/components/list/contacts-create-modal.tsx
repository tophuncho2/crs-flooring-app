"use client"

import { RecordPanelFooter } from "@/features/dashboard/shared/record-view/record-panel-footer"
import { RecordFormField, RecordModalShell } from "@/features/flooring/shared/ui/forms/record-form"
import { FormStatusNotices } from "@/features/dashboard/shared/feedback/notices"
import { CONTACT_TYPE_LABELS, CONTACT_TYPE_OPTIONS, type ContactForm } from "../../domain/types"

export function ContactsCreateModal({
  draft,
  message,
  error,
  isSaving,
  onClose,
  onFieldChange,
  onCreate,
}: {
  draft: ContactForm
  message: string
  error: string
  isSaving: boolean
  onClose: () => void
  onFieldChange: (field: keyof ContactForm, value: string) => void
  onCreate: () => void
}) {
  return (
    <RecordModalShell title="Create Contact" onClose={onClose} sizeClass="max-w-3xl">
      <div className="space-y-6">
        <FormStatusNotices message={message} error={error} loadingMessage={isSaving ? "Creating contact..." : ""} />
        <div className="grid gap-4 md:grid-cols-2">
          <RecordFormField label="Contact Name">
            <input value={draft.name} onChange={(event) => onFieldChange("name", event.target.value)} className="rounded border border-[var(--panel-border)] bg-transparent px-3 py-2" />
          </RecordFormField>
          <RecordFormField label="Contact Type">
            <select value={draft.type} onChange={(event) => onFieldChange("type", event.target.value)} className="rounded border border-[var(--panel-border)] bg-transparent px-3 py-2">
              <option value="">Select type</option>
              {CONTACT_TYPE_OPTIONS.map((option) => (
                <option key={option} value={option}>{CONTACT_TYPE_LABELS[option]}</option>
              ))}
            </select>
          </RecordFormField>
        </div>
        <RecordPanelFooter
          onClose={onClose}
          onSave={onCreate}
          saveLabel="Create Contact"
          savingLabel="Creating Contact..."
          isSaving={isSaving}
        />
      </div>
    </RecordModalShell>
  )
}
