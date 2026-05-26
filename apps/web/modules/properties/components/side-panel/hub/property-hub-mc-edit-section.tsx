"use client"

import type { ManagementCompanyForm } from "@builders/domain"
import { CellAt } from "@/components/layout-grid"
import { FieldSection, FormField } from "@/components/fields"
import { TextCell } from "@/components/cells"
import { HubSidePanelGroup } from "@/components/hub-side-panel"
import { AddressEditCell } from "@/components/composites/address-fields/address-edit-cell"
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
    <HubSidePanelGroup title="Management company">
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
        <AddressEditCell
          editable={editable}
          value={{
            streetAddress: mcEditForm.streetAddress,
            city: mcEditForm.city,
            state: mcEditForm.state,
            zip: mcEditForm.zip,
          }}
          onChange={(field, value) => setMcEditField(field, value)}
        />
      </FieldSection>
    </HubSidePanelGroup>
  )
}
