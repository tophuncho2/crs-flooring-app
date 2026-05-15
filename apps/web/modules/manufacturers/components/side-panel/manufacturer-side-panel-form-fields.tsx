"use client"

import { TextCell } from "@/components/cells"
import { FieldSection, FormField } from "@/components/fields"
import { CellAt } from "@/components/layout-grid/cell-at"
import type { ManufacturerSidePanelController } from "@/modules/manufacturers/controllers/use-manufacturer-side-panel"

export type ManufacturerSidePanelFormFieldsProps = {
  controller: ManufacturerSidePanelController
}

export function ManufacturerSidePanelFormFields({
  controller,
}: ManufacturerSidePanelFormFieldsProps) {
  const { form, isSaving } = controller
  const editable = !isSaving

  return (
    <FieldSection gap="0.75rem">
      <CellAt col={1} colSpan={4}>
        <FormField label="Company Name">
          <TextCell
            editable={editable}
            value={form.companyName}
            onChange={(next) => controller.setField("companyName", next)}
            placeholder="Company"
            ariaLabel="Manufacturer company name"
          />
        </FormField>
      </CellAt>
      <CellAt col={5} colSpan={4}>
        <FormField label="Agent Name">
          <TextCell
            editable={editable}
            value={form.agentName}
            onChange={(next) => controller.setField("agentName", next)}
            placeholder="Agent"
            ariaLabel="Manufacturer agent name"
          />
        </FormField>
      </CellAt>
      <CellAt col={1} colSpan={4}>
        <FormField label="Website">
          <TextCell
            editable={editable}
            value={form.website}
            onChange={(next) => controller.setField("website", next)}
            placeholder="https://"
            ariaLabel="Manufacturer website"
          />
        </FormField>
      </CellAt>
      <CellAt col={5} colSpan={2}>
        <FormField label="Phone">
          <TextCell
            editable={editable}
            value={form.phone}
            onChange={(next) => controller.setField("phone", next)}
            placeholder="Phone"
            ariaLabel="Manufacturer phone"
          />
        </FormField>
      </CellAt>
      <CellAt col={7} colSpan={2}>
        <FormField label="Email">
          <TextCell
            editable={editable}
            value={form.email}
            onChange={(next) => controller.setField("email", next)}
            placeholder="Email"
            ariaLabel="Manufacturer email"
          />
        </FormField>
      </CellAt>
    </FieldSection>
  )
}
