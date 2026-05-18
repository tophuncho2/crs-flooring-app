"use client"

import { CellAt } from "@/components/layout-grid"
import { FormField } from "@/components/fields"
import { SelectCell, TextCell } from "@/components/cells"
import {
  WO_UNIT_NUMBER_MAX,
  WO_UNIT_TYPE_MAX,
  type WorkOrderForm,
} from "@builders/domain"
import { VACANCY_OPTIONS } from "../helpers"

/**
 * Right column of rows 2–4: Vacancy → Unit Number → Unit Type. Renders
 * inside a parent `FieldSection`.
 */
export function WorkOrderUnitFieldsBand({
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
      <CellAt col={5} row={2} colSpan={4}>
        <FormField label="Vacancy">
          <SelectCell
            editable={editable}
            value={draft.vacancy}
            options={VACANCY_OPTIONS}
            placeholder="—"
            onChange={(value) => onFieldChange("vacancy", value as WorkOrderForm["vacancy"])}
          />
        </FormField>
      </CellAt>
      <CellAt col={5} row={3} colSpan={4}>
        <FormField label="Unit Number">
          <TextCell
            editable={editable}
            value={draft.unitNumber}
            onChange={(value) => onFieldChange("unitNumber", value)}
            maxLength={WO_UNIT_NUMBER_MAX}
          />
        </FormField>
      </CellAt>
      <CellAt col={5} row={4} colSpan={4}>
        <FormField label="Unit Type">
          <TextCell
            editable={editable}
            value={draft.unitType}
            onChange={(value) => onFieldChange("unitType", value)}
            maxLength={WO_UNIT_TYPE_MAX}
          />
        </FormField>
      </CellAt>
    </>
  )
}
