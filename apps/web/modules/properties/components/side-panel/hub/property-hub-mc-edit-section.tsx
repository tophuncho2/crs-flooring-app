"use client"

import { normalizeAddressState, type ManagementCompanyForm } from "@builders/domain"
import { CellAt } from "@/components/layout-grid"
import { FieldSection, FormField } from "@/components/fields"
import { TextCell } from "@/components/cells"
import type { PropertyHubSidePanelController } from "@/modules/properties/controllers/property-hub-side-panel"

/**
 * Editable MC cells used when the hub panel is in `section-edit-mc` mode.
 * Same 8-col field layout as the create variant minus the link picker —
 * editing an existing MC never re-links to another one.
 */
export function PropertyHubMcEditSection({
  controller,
}: {
  controller: PropertyHubSidePanelController
}) {
  const { mcEditForm, isSaving, setMcEditField } = controller
  const editable = !isSaving

  const onText =
    <K extends keyof ManagementCompanyForm>(field: K) =>
    (value: string) => {
      setMcEditField(field, value as ManagementCompanyForm[K])
    }

  return (
    <FieldSection gap="0.75rem">
      <CellAt col={1} colSpan={8}>
        <FormField label="Company Name" required>
          <TextCell
            editable={editable}
            value={mcEditForm.name}
            onChange={onText("name")}
            placeholder="Company name"
            ariaLabel="Company name"
          />
        </FormField>
      </CellAt>
      <CellAt col={1} colSpan={4}>
        <FormField label="Phone">
          <TextCell
            editable={editable}
            value={mcEditForm.phone}
            onChange={onText("phone")}
            placeholder="Phone"
            ariaLabel="Phone"
          />
        </FormField>
      </CellAt>
      <CellAt col={5} colSpan={4}>
        <FormField label="Email">
          <TextCell
            editable={editable}
            value={mcEditForm.email}
            onChange={onText("email")}
            placeholder="Email"
            ariaLabel="Email"
          />
        </FormField>
      </CellAt>
      <CellAt col={1} colSpan={8}>
        <FormField label="Street Address">
          <TextCell
            editable={editable}
            value={mcEditForm.streetAddress}
            onChange={onText("streetAddress")}
            placeholder="Street address"
            ariaLabel="Street address"
          />
        </FormField>
      </CellAt>
      <CellAt col={1} colSpan={4}>
        <FormField label="City">
          <TextCell
            editable={editable}
            value={mcEditForm.city}
            onChange={onText("city")}
            placeholder="City"
            ariaLabel="City"
          />
        </FormField>
      </CellAt>
      <CellAt col={5} colSpan={2}>
        <FormField label="State">
          <TextCell
            editable={editable}
            value={mcEditForm.state}
            onChange={(value) => setMcEditField("state", normalizeAddressState(value))}
            placeholder="ST"
            ariaLabel="State"
          />
        </FormField>
      </CellAt>
      <CellAt col={7} colSpan={2}>
        <FormField label="Zip">
          <TextCell
            editable={editable}
            value={mcEditForm.zip}
            onChange={onText("zip")}
            placeholder="Zip"
            ariaLabel="Zip"
          />
        </FormField>
      </CellAt>
    </FieldSection>
  )
}
