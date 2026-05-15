"use client"

import { TextCell, TextareaCell } from "@/components/cells"
import { FieldSection, FormField } from "@/components/fields"
import { CellAt } from "@/components/layout-grid/cell-at"
import type { WarehouseSidePanelController } from "@/modules/warehouse/controllers/use-warehouse-side-panel"

export type WarehouseSidePanelFormFieldsProps = {
  controller: WarehouseSidePanelController
}

export function WarehouseSidePanelFormFields({ controller }: WarehouseSidePanelFormFieldsProps) {
  const { form, isSaving } = controller
  const editable = !isSaving

  return (
    <FieldSection gap="0.75rem">
      <CellAt col={1} colSpan={5}>
        <FormField label="Warehouse Name" required>
          <TextCell
            editable={editable}
            value={form.name}
            onChange={(next) => controller.setField("name", next)}
            placeholder="Warehouse"
            ariaLabel="Warehouse name"
          />
        </FormField>
      </CellAt>
      <CellAt col={6} colSpan={3}>
        <FormField label="Store Phone">
          <TextCell
            editable={editable}
            value={form.phone}
            onChange={(next) => controller.setField("phone", next)}
            placeholder="Store phone"
            ariaLabel="Warehouse phone"
          />
        </FormField>
      </CellAt>
      <CellAt col={1} colSpan={8}>
        <FormField label="Address">
          <TextareaCell
            editable={editable}
            value={form.address}
            onChange={(next) => controller.setField("address", next)}
            placeholder="Address"
            ariaLabel="Warehouse address"
            rows={3}
          />
        </FormField>
      </CellAt>
    </FieldSection>
  )
}
