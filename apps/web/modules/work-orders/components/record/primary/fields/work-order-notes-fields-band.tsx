"use client"

import { CellAt } from "@/components/layout-grid"
import { FormField } from "@/components/fields"
import { TextareaCell } from "@/components/cells"
import {
  WO_CUSTOM_ADDRESS_MAX,
  WO_DESCRIPTION_MAX,
  WO_INSTALLER_INSTRUCTIONS_MAX,
  WO_INTERNAL_NOTES_MAX,
  type WorkOrderForm,
} from "@builders/domain"

/**
 * Long-form textarea fields. Rows 5–6 hold Description + Custom Address;
 * rows 9–10 hold Installer Instructions + Internal Notes. Row 7–8 are
 * left to `PropertyJoinedReadOnlyCells` (rendered by the composer
 * between these blocks). Each cell declares its own row, so the rendering
 * order in the parent `FieldSection` doesn't matter.
 */
export function WorkOrderNotesFieldsBand({
  editable,
  draft,
  onFieldChange,
}: {
  editable: boolean
  draft: WorkOrderForm
  onFieldChange: <K extends keyof WorkOrderForm>(field: K, value: WorkOrderForm[K]) => void
}) {
  return (
    <>
      <CellAt col={1} row={5} colSpan={8}>
        <FormField label="Description">
          <TextareaCell
            editable={editable}
            value={draft.description}
            onChange={(value) => onFieldChange("description", value)}
            maxLength={WO_DESCRIPTION_MAX}
            rows={2}
          />
        </FormField>
      </CellAt>

      <CellAt col={1} row={6} colSpan={8}>
        <FormField label="Custom Address (overrides property address on PDF)">
          <TextareaCell
            editable={editable}
            value={draft.customAddress}
            onChange={(value) => onFieldChange("customAddress", value)}
            maxLength={WO_CUSTOM_ADDRESS_MAX}
            rows={2}
          />
        </FormField>
      </CellAt>

      <CellAt col={1} row={9} colSpan={8}>
        <FormField label="Installer Instructions (appears on PDF)">
          <TextareaCell
            editable={editable}
            value={draft.installerInstructions}
            onChange={(value) => onFieldChange("installerInstructions", value)}
            maxLength={WO_INSTALLER_INSTRUCTIONS_MAX}
            rows={3}
          />
        </FormField>
      </CellAt>

      <CellAt col={1} row={10} colSpan={8}>
        <FormField label="Internal Notes (not shown on PDF)">
          <TextareaCell
            editable={editable}
            value={draft.internalNotes}
            onChange={(value) => onFieldChange("internalNotes", value)}
            maxLength={WO_INTERNAL_NOTES_MAX}
            rows={3}
          />
        </FormField>
      </CellAt>
    </>
  )
}
