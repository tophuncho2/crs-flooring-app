"use client"

import { TextareaCell } from "@/components/cells"
import {
  WO_DESCRIPTION_MAX,
  WO_INTERNAL_NOTES_MAX,
  type WorkOrderForm,
} from "@builders/domain"
import { WorkOrderCompleteChip } from "../controls/work-order-complete-chip"
import { WorkOrderField } from "./work-order-field"
import { WorkOrderGroup } from "./work-order-group"

/**
 * Group 3: Notes. Holds the internal-notes textarea and surfaces the
 * complete-status chip in the group header (next to the tab) rather
 * than as a body field.
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
    <WorkOrderGroup
      title="Notes"
      headerRight={
        <WorkOrderCompleteChip
          value={draft.isComplete}
          onChange={(next) => onFieldChange("isComplete", next)}
          disabled={!editable}
        />
      }
    >
      <div className="flex flex-col gap-3">
        <WorkOrderField label="Description">
          <TextareaCell
            editable={editable}
            value={draft.description}
            onChange={(value) => onFieldChange("description", value)}
            maxLength={WO_DESCRIPTION_MAX}
            rows={2}
          />
        </WorkOrderField>
        <WorkOrderField label="Internal Notes (not shown on PDF)">
          <TextareaCell
            editable={editable}
            value={draft.internalNotes}
            onChange={(value) => onFieldChange("internalNotes", value)}
            maxLength={WO_INTERNAL_NOTES_MAX}
            rows={4}
          />
        </WorkOrderField>
      </div>
    </WorkOrderGroup>
  )
}
