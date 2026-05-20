"use client"

import { normalizeAddressState, type PropertyPrimaryForm } from "@builders/domain"
import { CellAt } from "@/components/layout-grid"
import { FieldSection, FormField } from "@/components/fields"
import { TextCell, TextareaCell } from "@/components/cells"
import { ManagementCompanyPicker } from "@/modules/management-companies/components/picker/management-company-picker"
import type { PropertySidePanelController } from "@/modules/properties/controllers/side-panel/use-property-side-panel"

export function PropertySidePanelForm({
  controller,
}: {
  controller: PropertySidePanelController
}) {
  const { form, isSaving, managementCompanyLabel, setField, setManagementCompany } = controller
  const editable = !isSaving

  const onTextChange = <K extends keyof PropertyPrimaryForm>(field: K) => (value: string) => {
    setField(field, value as PropertyPrimaryForm[K])
  }

  return (
    <FieldSection gap="0.75rem">
      <CellAt col={1} colSpan={8}>
        <FormField label="Property Name" required>
          <TextCell
            editable={editable}
            value={form.name}
            onChange={onTextChange("name")}
            placeholder="Property name"
            ariaLabel="Property name"
          />
        </FormField>
      </CellAt>
      <CellAt col={1} colSpan={8}>
        <FormField label="Management Company">
          <ManagementCompanyPicker
            value={form.managementCompanyId || null}
            onChange={(id) => setManagementCompany(id, id === null ? null : managementCompanyLabel)}
            selectedLabel={managementCompanyLabel}
            disabled={!editable}
            placeholder="No management company"
            ariaLabel="Management company"
          />
        </FormField>
      </CellAt>
      <CellAt col={1} colSpan={4}>
        <FormField label="Phone">
          <TextCell
            editable={editable}
            value={form.phone}
            onChange={onTextChange("phone")}
            placeholder="Phone"
            ariaLabel="Phone"
          />
        </FormField>
      </CellAt>
      <CellAt col={5} colSpan={4}>
        <FormField label="Email">
          <TextCell
            editable={editable}
            value={form.email}
            onChange={onTextChange("email")}
            placeholder="Email"
            ariaLabel="Email"
          />
        </FormField>
      </CellAt>
      <CellAt col={1} colSpan={8}>
        <FormField label="Street Address">
          <TextCell
            editable={editable}
            value={form.streetAddress}
            onChange={onTextChange("streetAddress")}
            placeholder="Street address"
            ariaLabel="Street address"
          />
        </FormField>
      </CellAt>
      <CellAt col={1} colSpan={4}>
        <FormField label="City">
          <TextCell
            editable={editable}
            value={form.city}
            onChange={onTextChange("city")}
            placeholder="City"
            ariaLabel="City"
          />
        </FormField>
      </CellAt>
      <CellAt col={5} colSpan={2}>
        <FormField label="State">
          <TextCell
            editable={editable}
            value={form.state}
            onChange={(value) => setField("state", normalizeAddressState(value))}
            placeholder="ST"
            ariaLabel="State"
          />
        </FormField>
      </CellAt>
      <CellAt col={7} colSpan={2}>
        <FormField label="Zip">
          <TextCell
            editable={editable}
            value={form.zip}
            onChange={onTextChange("zip")}
            placeholder="Zip"
            ariaLabel="Zip"
          />
        </FormField>
      </CellAt>
      <CellAt col={1} colSpan={8}>
        <FormField label="Instructions">
          <TextareaCell
            editable={editable}
            value={form.instructions}
            onChange={onTextChange("instructions")}
            placeholder="Instructions"
            ariaLabel="Instructions"
            rows={3}
          />
        </FormField>
      </CellAt>
    </FieldSection>
  )
}
