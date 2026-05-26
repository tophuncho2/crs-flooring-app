"use client"

import type { PropertyPrimaryForm } from "@builders/domain"
import { CellAt } from "@/components/layout-grid"
import { FieldSection, FormField } from "@/components/fields"
import { TextCell, TextareaCell } from "@/components/cells"
import { HubSidePanelGroup } from "@/components/hub-side-panel"
import { AddressEditCell } from "@/components/composites/address-fields/address-edit-cell"
import type { PropertyHubSidePanelController } from "@/modules/properties/controllers/property-hub-side-panel"

/**
 * Editable property cells used when the hub panel is in
 * `section-edit-property` mode. Same 8-col field layout as the create
 * property cells exactly — the user wants the panel to render identical
 * cells whether they're creating from "+ Hub" or editing from a list row.
 *
 * No MC picker here: the MC linkage is determined by the parent hub and
 * persists in the form state without a visible UI control (matches the
 * hub-create property section, which also assumes the MC from the section
 * above it).
 */
export function PropertyHubPropertyEditSection({
  controller,
}: {
  controller: PropertyHubSidePanelController
}) {
  const { propertyEditForm, isSaving, setPropertyEditField } = controller
  const editable = !isSaving

  const onText =
    <K extends keyof PropertyPrimaryForm>(field: K) =>
    (value: string) => {
      setPropertyEditField(field, value as PropertyPrimaryForm[K])
    }

  return (
    <HubSidePanelGroup title="Property">
      <FieldSection gap="0.75rem">
        <CellAt col={1} colSpan={8}>
          <FormField label="Property Name" required>
            <TextCell
              editable={editable}
              value={propertyEditForm.name}
              onChange={onText("name")}
              placeholder="Property name"
              ariaLabel="Property name"
            />
          </FormField>
        </CellAt>
        <CellAt col={1} colSpan={4}>
          <FormField label="Phone">
            <TextCell
              editable={editable}
              value={propertyEditForm.phone}
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
              value={propertyEditForm.email}
              onChange={onText("email")}
              placeholder="Email"
              ariaLabel="Email"
            />
          </FormField>
        </CellAt>
        <AddressEditCell
          editable={editable}
          value={{
            streetAddress: propertyEditForm.streetAddress,
            city: propertyEditForm.city,
            state: propertyEditForm.state,
            zip: propertyEditForm.zip,
          }}
          onChange={(field, value) => setPropertyEditField(field, value)}
        />
        <CellAt col={1} colSpan={8}>
          <FormField label="Instructions">
            <TextareaCell
              editable={editable}
              value={propertyEditForm.instructions}
              onChange={onText("instructions")}
              placeholder="Instructions"
              ariaLabel="Instructions"
              rows={3}
            />
          </FormField>
        </CellAt>
      </FieldSection>
    </HubSidePanelGroup>
  )
}
