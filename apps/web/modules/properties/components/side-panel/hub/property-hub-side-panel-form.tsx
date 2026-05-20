"use client"

import {
  normalizeAddressState,
  type ManagementCompanyForm,
  type PropertyHubPropertyFields,
} from "@builders/domain"
import { CellAt } from "@/components/layout-grid"
import { FieldSection, FormField } from "@/components/fields"
import { TextCell, TextareaCell } from "@/components/cells"
import { ManagementCompanyPicker } from "@/modules/management-companies/components/picker/management-company-picker"
import type { PropertyHubSidePanelController } from "@/modules/properties/controllers/side-panel/use-property-hub-side-panel"

const SECTION_HEADER_CLASS =
  "text-xs font-semibold uppercase tracking-wide text-[var(--panel-foreground-muted)]"

export function PropertyHubSidePanelForm({
  controller,
}: {
  controller: PropertyHubSidePanelController
}) {
  const {
    mcMode,
    mcLinkId,
    mcLinkLabel,
    mcForm,
    propertyForm,
    isSaving,
    setMcLink,
    setMcField,
    setPropertyField,
  } = controller

  const mcLinkDisabled = mcMode === "create" || isSaving
  const mcFieldsDisabled = mcMode === "link" || isSaving
  const propertyDisabled = isSaving

  const onMcText =
    <K extends keyof ManagementCompanyForm>(field: K) =>
    (value: string) => {
      setMcField(field, value as ManagementCompanyForm[K])
    }

  const onPropertyText =
    <K extends keyof PropertyHubPropertyFields>(field: K) =>
    (value: string) => {
      setPropertyField(field, value as PropertyHubPropertyFields[K])
    }

  return (
    <div className="flex flex-col gap-5">
      <section className="flex flex-col gap-2">
        <div className={SECTION_HEADER_CLASS}>Management Company</div>
        <FieldSection gap="0.75rem">
          <CellAt col={1} colSpan={8}>
            <FormField label="Link existing company">
              <ManagementCompanyPicker
                value={mcLinkId}
                selectedLabel={mcLinkLabel}
                onChange={(id) => setMcLink(id, id === null ? null : mcLinkLabel)}
                disabled={mcLinkDisabled}
                placeholder="No management company"
                ariaLabel="Link management company"
              />
            </FormField>
          </CellAt>
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
          <CellAt col={1} colSpan={8}>
            <FormField label="Street Address">
              <TextCell
                editable={!mcFieldsDisabled}
                value={mcForm.streetAddress}
                onChange={onMcText("streetAddress")}
                placeholder="Street address"
                ariaLabel="New company street address"
              />
            </FormField>
          </CellAt>
          <CellAt col={1} colSpan={4}>
            <FormField label="City">
              <TextCell
                editable={!mcFieldsDisabled}
                value={mcForm.city}
                onChange={onMcText("city")}
                placeholder="City"
                ariaLabel="New company city"
              />
            </FormField>
          </CellAt>
          <CellAt col={5} colSpan={2}>
            <FormField label="State">
              <TextCell
                editable={!mcFieldsDisabled}
                value={mcForm.state}
                onChange={(value) => setMcField("state", normalizeAddressState(value))}
                placeholder="ST"
                ariaLabel="New company state"
              />
            </FormField>
          </CellAt>
          <CellAt col={7} colSpan={2}>
            <FormField label="Zip">
              <TextCell
                editable={!mcFieldsDisabled}
                value={mcForm.zip}
                onChange={onMcText("zip")}
                placeholder="Zip"
                ariaLabel="New company zip"
              />
            </FormField>
          </CellAt>
        </FieldSection>
      </section>

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
    </div>
  )
}
