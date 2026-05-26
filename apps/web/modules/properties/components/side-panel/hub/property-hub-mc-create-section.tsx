"use client"

import type { ManagementCompanyForm } from "@builders/domain"
import { CellAt } from "@/components/layout-grid"
import { FieldSection, FormField } from "@/components/fields"
import { TextCell } from "@/components/cells"
import { HubSidePanelGroup } from "@/components/hub-side-panel"
import { AddressEditCell } from "@/components/composites/address-fields/address-edit-cell"
import type { PropertyHubSidePanelController } from "@/modules/properties/controllers/property-hub-side-panel"

/**
 * Create-mode MC half of the unified hub side panel — "create new"
 * fields only. The "link existing" trigger lives in the sticky topToolbar
 * (see `PropertyHubSidePanel`); link + create are mutually exclusive and
 * the body cells disable when the user has picked an existing company.
 */
export function PropertyHubMcCreateSection({
  controller,
}: {
  controller: PropertyHubSidePanelController
}) {
  const { mcMode, mcForm, isSaving, setMcField } = controller

  const mcFieldsDisabled = mcMode === "link" || isSaving

  const onMcText =
    <K extends keyof ManagementCompanyForm>(field: K) =>
    (value: string) => {
      setMcField(field, value as ManagementCompanyForm[K])
    }

  return (
    <HubSidePanelGroup title="Management company">
      <FieldSection gap="0.75rem">
        <CellAt col={1} colSpan={8}>
          <FormField label="Or create new — Company Name">
            <TextCell
              editable={!mcFieldsDisabled}
              value={mcForm.name}
              onChange={onMcText("name")}
              placeholder="Company name"
              ariaLabel="New company name"
            />
          </FormField>
        </CellAt>
        <CellAt col={1} colSpan={4}>
          <FormField label="Phone">
            <TextCell
              editable={!mcFieldsDisabled}
              value={mcForm.phone}
              onChange={onMcText("phone")}
              placeholder="Phone"
              ariaLabel="New company phone"
            />
          </FormField>
        </CellAt>
        <CellAt col={5} colSpan={4}>
          <FormField label="Email">
            <TextCell
              editable={!mcFieldsDisabled}
              value={mcForm.email}
              onChange={onMcText("email")}
              placeholder="Email"
              ariaLabel="New company email"
            />
          </FormField>
        </CellAt>
        <AddressEditCell
          editable={!mcFieldsDisabled}
          ariaPrefix="New company"
          value={{
            streetAddress: mcForm.streetAddress,
            city: mcForm.city,
            state: mcForm.state,
            zip: mcForm.zip,
          }}
          onChange={(field, value) => setMcField(field, value)}
        />
      </FieldSection>
    </HubSidePanelGroup>
  )
}
