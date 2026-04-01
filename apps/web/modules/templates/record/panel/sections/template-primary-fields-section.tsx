"use client"

import type { Dispatch, SetStateAction } from "react"
import {
  AutoGrowTextarea,
  RECORD_FIELD_CONTROL_CLASS_NAME,
  RECORD_TEXTAREA_CONTROL_CLASS_NAME,
  RecordFormField,
  RecordPrimaryFieldCell,
  RecordPrimaryFieldsGrid,
  RecordPrimaryPane,
  RecordPrimarySection,
} from "@/modules/shared/engines/record-view"
import type { DraftTemplate, PropertyOption, WarehouseOption } from "@/modules/templates/types"

export function TemplatePrimaryFieldsSection({
  draft,
  propertyOptions,
  warehouseOptions,
  padProductOptions,
  propertyLocked = false,
  setDraft,
}: {
  draft: DraftTemplate
  propertyOptions: PropertyOption[]
  warehouseOptions: WarehouseOption[]
  padProductOptions: Array<{ id: string; label: string }>
  propertyLocked?: boolean
  setDraft: Dispatch<SetStateAction<DraftTemplate>>
}) {
  return (
    <RecordPrimarySection>
      <RecordPrimaryPane variant="side">
        <RecordPrimaryFieldsGrid variant="side">
          <RecordPrimaryFieldCell>
            <RecordFormField label="Warehouse">
              <select
                value={draft.warehouseId}
                onChange={(event) => setDraft((previous) => ({ ...previous, warehouseId: event.target.value }))}
                className={RECORD_FIELD_CONTROL_CLASS_NAME}
              >
                <option value="">No warehouse</option>
                {warehouseOptions.map((warehouse) => (
                  <option key={warehouse.id} value={warehouse.id}>
                    {warehouse.name}
                  </option>
                ))}
              </select>
            </RecordFormField>
          </RecordPrimaryFieldCell>
          <RecordPrimaryFieldCell>
            <RecordFormField label="Pad Type">
              <select
                value={draft.padProductId}
                onChange={(event) => setDraft((previous) => ({ ...previous, padProductId: event.target.value }))}
                className={RECORD_FIELD_CONTROL_CLASS_NAME}
              >
                <option value="">No pad type</option>
                {padProductOptions.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.label}
                  </option>
                ))}
              </select>
            </RecordFormField>
          </RecordPrimaryFieldCell>
        </RecordPrimaryFieldsGrid>
      </RecordPrimaryPane>

      <RecordPrimaryPane variant="main">
        <RecordPrimaryFieldsGrid>
          <RecordPrimaryFieldCell size="md">
            <RecordFormField label="Property">
              <select
                value={draft.propertyId}
                onChange={(event) => setDraft((previous) => ({ ...previous, propertyId: event.target.value }))}
                className={RECORD_FIELD_CONTROL_CLASS_NAME}
                disabled={propertyLocked}
              >
                <option value="">Select property</option>
                {propertyOptions.map((property) => (
                  <option key={property.id} value={property.id}>
                    {property.name}
                  </option>
                ))}
              </select>
            </RecordFormField>
          </RecordPrimaryFieldCell>
          <RecordPrimaryFieldCell size="sm">
            <RecordFormField label="Template Tag">
              <input
                value={draft.templateTag}
                onChange={(event) => setDraft((previous) => ({ ...previous, templateTag: event.target.value }))}
                className={RECORD_FIELD_CONTROL_CLASS_NAME}
              />
            </RecordFormField>
          </RecordPrimaryFieldCell>
          <RecordPrimaryFieldCell size="lg">
            <RecordFormField label="Instructions">
              <AutoGrowTextarea
                value={draft.instructions}
                onChange={(event) => setDraft((previous) => ({ ...previous, instructions: event.target.value }))}
                className={RECORD_TEXTAREA_CONTROL_CLASS_NAME}
              />
            </RecordFormField>
          </RecordPrimaryFieldCell>
          <RecordPrimaryFieldCell size="lg">
            <RecordFormField label="Template Notes">
              <AutoGrowTextarea
                value={draft.templateNotes}
                onChange={(event) => setDraft((previous) => ({ ...previous, templateNotes: event.target.value }))}
                className={RECORD_TEXTAREA_CONTROL_CLASS_NAME}
              />
            </RecordFormField>
          </RecordPrimaryFieldCell>
        </RecordPrimaryFieldsGrid>
      </RecordPrimaryPane>
    </RecordPrimarySection>
  )
}
