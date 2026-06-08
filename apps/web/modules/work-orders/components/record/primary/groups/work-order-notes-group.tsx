"use client"

import { StaticFieldValue, TextareaCell } from "@/engines/record-view"
import { formatEasternDateTime, WO_INTERNAL_NOTES_MAX, type WorkOrderForm } from "@builders/domain"
import type { WorkOrderPrimaryDetail } from "../types"
import { WorkOrderField } from "./work-order-field"
import { WorkOrderGroup } from "./work-order-group"

/**
 * Group 3: Notes. Holds the internal-notes textarea, plus read-only
 * Created / Updated timestamps for saved records (`detail` is null in
 * the create flow, where no timestamps exist yet).
 */
export function WorkOrderNotesGroup({
  editable,
  draft,
  detail,
  onFieldChange,
}: {
  editable: boolean
  draft: WorkOrderForm
  detail: WorkOrderPrimaryDetail | null
  onFieldChange: <K extends keyof WorkOrderForm>(field: K, value: WorkOrderForm[K]) => void
}) {
  return (
    <WorkOrderGroup title="Notes">
      <div className="flex flex-col gap-3">
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
        {detail ? (
          <div className="grid grid-cols-2 gap-3">
            <WorkOrderField label="Created">
              <StaticFieldValue>{formatEasternDateTime(detail.createdAt) || "—"}</StaticFieldValue>
            </WorkOrderField>
            <WorkOrderField label="Updated">
              <StaticFieldValue>{formatEasternDateTime(detail.updatedAt) || "—"}</StaticFieldValue>
            </WorkOrderField>
          </div>
        ) : null}
      </div>
    </WorkOrderGroup>
  )
}
