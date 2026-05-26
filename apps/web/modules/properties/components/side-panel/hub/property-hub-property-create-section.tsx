"use client"

import type { PropertyHubPropertyFields } from "@builders/domain"
import { CellAt } from "@/components/layout-grid"
import { FieldSection, FormField } from "@/components/fields"
import { TextCell, TextareaCell } from "@/components/cells"
import { HubSidePanelGroup } from "@/components/hub-side-panel"
import { AddressEditCell } from "@/components/composites/address-fields/address-edit-cell"
import type { PropertyHubSidePanelController } from "@/modules/properties/controllers/property-hub-side-panel"

/**
 * Create-mode property half of the unified hub side panel. Standard 8-col
 * field layout matching the edit-mode property cells exactly — same cells,
 * same shape; the only difference is the source of truth (create draft vs
 * edit draft) which the panel orchestrator selects per mode.
 */
export function PropertyHubPropertyCreateSection({
  controller,
}: {
  controller: PropertyHubSidePanelController
}) {
  const { propertyForm, isSaving, setPropertyField } = controller
  const propertyDisabled = isSaving

  const onPropertyText =
    <K extends keyof PropertyHubPropertyFields>(field: K) =>
    (value: string) => {
      setPropertyField(field, value as PropertyHubPropertyFields[K])
    }

  return (
    <HubSidePanelGroup title="Property">
      <FieldSection gap="0.75rem">
        <CellAt col={1} colSpan={8}>
          <FormField label="Property Name">
            <TextCell
              editable={!propertyDisabled}
              value={propertyForm.name}
              onChange={onPropertyText("name")}
              placeholder="Property name"
              ariaLabel="Property name"
            />
          </FormField>
        </CellAt>
        <CellAt col={1} colSpan={4}>
          <FormField label="Phone">
            <TextCell
              editable={!propertyDisabled}
              value={propertyForm.phone}
              onChange={onPropertyText("phone")}
              placeholder="Phone"
              ariaLabel="Property phone"
            />
          </FormField>
        </CellAt>
        <CellAt col={5} colSpan={4}>
          <FormField label="Email">
            <TextCell
              editable={!propertyDisabled}
              value={propertyForm.email}
              onChange={onPropertyText("email")}
              placeholder="Email"
              ariaLabel="Property email"
            />
          </FormField>
        </CellAt>
        <AddressEditCell
          editable={!propertyDisabled}
          ariaPrefix="Property"
          value={{
            streetAddress: propertyForm.streetAddress,
            city: propertyForm.city,
            state: propertyForm.state,
            zip: propertyForm.zip,
          }}
          onChange={(field, value) => setPropertyField(field, value)}
        />
        <CellAt col={1} colSpan={8}>
          <FormField label="Instructions">
            <TextareaCell
              editable={!propertyDisabled}
              value={propertyForm.instructions}
              onChange={onPropertyText("instructions")}
              placeholder="Instructions"
              ariaLabel="Property instructions"
              rows={3}
            />
          </FormField>
        </CellAt>
      </FieldSection>
    </HubSidePanelGroup>
  )
}
