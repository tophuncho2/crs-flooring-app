"use client"

import { normalizeAddressState, type ManagementCompanyForm } from "@builders/domain"
import { CellAt } from "@/components/layout-grid"
import { FieldSection, FormField } from "@/components/fields"
import { TextCell } from "@/components/cells"
import type { PropertyHubSidePanelController } from "@/modules/properties/controllers/property-hub-side-panel"

const SECTION_HEADER_CLASS =
  "text-xs font-semibold uppercase tracking-wide text-[var(--panel-foreground-muted,_var(--foreground))]/65"

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
    <section className="flex flex-col gap-2">
      <div className={SECTION_HEADER_CLASS}>Management Company</div>
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
  )
}
