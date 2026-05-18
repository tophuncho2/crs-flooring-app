"use client"

import { normalizeAddressState, type ManagementCompanyForm } from "@builders/domain"
import { CellAt } from "@/components/layout-grid"
import { FieldSection, FormField } from "@/components/fields"
import { TextCell } from "@/components/cells"
import type { ManagementCompanySidePanelController } from "@/modules/management-companies/controllers/list/use-management-company-side-panel"

export function ManagementCompanySidePanelForm({
  controller,
}: {
  controller: ManagementCompanySidePanelController
}) {
  const { form, isSaving, setField } = controller
  const editable = !isSaving

  const onTextChange = <K extends keyof ManagementCompanyForm>(field: K) => (value: string) => {
    setField(field, value as ManagementCompanyForm[K])
  }

  return (
    <FieldSection gap="0.75rem">
      <CellAt col={1} colSpan={8}>
        <FormField label="Company Name" required>
          <TextCell
            editable={editable}
            value={form.name}
            onChange={onTextChange("name")}
            placeholder="Company name"
            ariaLabel="Company name"
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
    </FieldSection>
  )
}
