"use client"

import { TextareaCell } from "@/components/cells"
import { TEMPLATE_INTERNAL_NOTES_MAX, type TemplateForm } from "@builders/domain"
import { TemplateField } from "./template-field"
import { TemplateGroup } from "./template-group"

/**
 * Group 3: Notes. Holds the internal-notes textarea. Template-only —
 * internal notes do not sync to the work order on template apply.
 */
export function TemplateNotesGroup({
  editable,
  draft,
  onFieldChange,
}: {
  editable: boolean
  draft: TemplateForm
  onFieldChange: (field: keyof TemplateForm, value: string) => void
}) {
  return (
    <TemplateGroup title="Notes">
      <TemplateField
        label="Internal Notes"
        editable={editable}
        currentLength={draft.internalNotes.length}
        maxLength={TEMPLATE_INTERNAL_NOTES_MAX}
      >
        <TextareaCell
          editable={editable}
          value={draft.internalNotes}
          onChange={(value) => onFieldChange("internalNotes", value)}
          maxLength={TEMPLATE_INTERNAL_NOTES_MAX}
          rows={4}
        />
      </TemplateField>
    </TemplateGroup>
  )
}
