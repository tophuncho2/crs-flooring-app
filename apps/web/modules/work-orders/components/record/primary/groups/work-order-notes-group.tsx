"use client"

import { TextareaCell } from "@/components/cells"
import { WO_INTERNAL_NOTES_MAX, type WorkOrderForm } from "@builders/domain"
import { WorkOrderField } from "./work-order-field"
import { WorkOrderGroup } from "./work-order-group"

/**
 * Group 3: Notes. Holds the internal-notes textarea.
 */
export function WorkOrderNotesGroup({
  editable,
  draft,
  onFieldChange,
}: {
  editable: boolean
  draft: WorkOrderForm
  onFieldChange: <K extends keyof WorkOrderForm>(field: K, value: WorkOrderForm[K]) => void
}) {
  return (
    <WorkOrderGroup title="Notes">
      <WorkOrderField
        label="Internal Notes"
        editable={editable}
        currentLength={draft.internalNotes.length}
        maxLength={WO_INTERNAL_NOTES_MAX}
      >
        <TextareaCell
          editable={editable}
          value={draft.internalNotes}
          onChange={(value) => onFieldChange("internalNotes", value)}
          maxLength={WO_INTERNAL_NOTES_MAX}
          rows={4}
        />
      </WorkOrderField>
    </WorkOrderGroup>
  )
}
