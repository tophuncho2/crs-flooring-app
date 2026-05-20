"use client"

import { normalizeAddressState, type PropertyHubPropertyFields } from "@builders/domain"
import { CellAt } from "@/components/layout-grid"
import { FieldSection, FormField } from "@/components/fields"
import { TextCell, TextareaCell } from "@/components/cells"
import type { PropertyHubSidePanelController } from "@/modules/properties/controllers/property-hub-side-panel"

const SECTION_HEADER_CLASS =
  "text-xs font-semibold uppercase tracking-wide text-[var(--panel-foreground-muted)]"

export function PropertyHubPropertySection({
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
    <section className="flex flex-col gap-2">
      <div className={SECTION_HEADER_CLASS}>Property</div>
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
        <CellAt col={1} colSpan={8}>
          <FormField label="Street Address">
            <TextCell
              editable={!propertyDisabled}
              value={propertyForm.streetAddress}
              onChange={onPropertyText("streetAddress")}
              placeholder="Street address"
              ariaLabel="Property street address"
            />
          </FormField>
        </CellAt>
        <CellAt col={1} colSpan={4}>
          <FormField label="City">
            <TextCell
              editable={!propertyDisabled}
              value={propertyForm.city}
              onChange={onPropertyText("city")}
              placeholder="City"
              ariaLabel="Property city"
            />
          </FormField>
        </CellAt>
        <CellAt col={5} colSpan={2}>
          <FormField label="State">
            <TextCell
              editable={!propertyDisabled}
              value={propertyForm.state}
              onChange={(value) => setPropertyField("state", normalizeAddressState(value))}
              placeholder="ST"
              ariaLabel="Property state"
            />
          </FormField>
        </CellAt>
        <CellAt col={7} colSpan={2}>
          <FormField label="Zip">
            <TextCell
              editable={!propertyDisabled}
              value={propertyForm.zip}
              onChange={onPropertyText("zip")}
              placeholder="Zip"
              ariaLabel="Property zip"
            />
          </FormField>
        </CellAt>
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
    </section>
  )
}
