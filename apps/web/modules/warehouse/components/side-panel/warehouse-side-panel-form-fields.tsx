"use client"

import { normalizeAddressState } from "@builders/domain"
import { TextCell } from "@/components/cells"
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
        <FormField label="Street Address">
          <TextCell
            editable={editable}
            value={form.streetAddress}
            onChange={(next) => controller.setField("streetAddress", next)}
            placeholder="Street address"
            ariaLabel="Warehouse street address"
          />
        </FormField>
      </CellAt>
      <CellAt col={1} colSpan={4}>
        <FormField label="City">
          <TextCell
            editable={editable}
            value={form.city}
            onChange={(next) => controller.setField("city", next)}
            placeholder="City"
            ariaLabel="Warehouse city"
          />
        </FormField>
      </CellAt>
      <CellAt col={5} colSpan={2}>
        <FormField label="State">
          <TextCell
            editable={editable}
            value={form.state}
            onChange={(next) => controller.setField("state", normalizeAddressState(next))}
            placeholder="ST"
            ariaLabel="Warehouse state"
          />
        </FormField>
      </CellAt>
      <CellAt col={7} colSpan={2}>
        <FormField label="Postal Code">
          <TextCell
            editable={editable}
            value={form.postalCode}
            onChange={(next) => controller.setField("postalCode", next)}
            placeholder="Postal code"
            ariaLabel="Warehouse postal code"
          />
        </FormField>
      </CellAt>
    </FieldSection>
  )
}
