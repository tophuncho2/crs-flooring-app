"use client"

import type { ManagementCompanyForm, ManagementCompanyOption } from "@builders/domain"
import { FormField } from "@/engines/record-view"
import { ActionHeader } from "@/engines/common"
import { ManagementCompanyPicker } from "@/modules/management-companies/components/picker/management-company-picker"
import { ManagementCompanyCellsSection } from "@/modules/management-companies/components/record/management-company-cells-section"
import {
  deriveMcMode,
  type PropertyHubCreateForm,
} from "@/modules/management-companies/controllers/record/properties/use-property-hub-create-section"

const SECTION_CARD_CLASS =
  "rounded-xl border border-[var(--panel-border)] bg-[var(--panel-background)]"

/**
 * The management-company half of the hub create form: link an existing company
 * (picker) OR create a new one (cells). The two are mutually exclusive — picking
 * a link disables the create cells and vice-versa (the legacy `deriveMcMode`
 * rule). Leaving both empty creates the property with no company.
 */
export function ManagementCompanySelectSection({
  value,
  disabled,
  onLink,
  onMcFieldChange,
}: {
  value: PropertyHubCreateForm
  disabled: boolean
  onLink: (option: ManagementCompanyOption | null) => void
  onMcFieldChange: <K extends keyof ManagementCompanyForm>(
    field: K,
    next: ManagementCompanyForm[K],
  ) => void
}) {
  const mode = deriveMcMode(value)

  return (
    <div className={SECTION_CARD_CLASS}>
      <ActionHeader title="Management Company" />
      <div className="space-y-4 p-4">
        <FormField label="Link existing company">
          <ManagementCompanyPicker
            value={value.mcLinkId}
            selectedLabel={value.mcLinkLabel}
            disabled={disabled || mode === "create"}
            placeholder="Link an existing company (optional)"
            ariaLabel="Link existing management company"
            onChange={(id) => {
              if (!id) onLink(null)
            }}
            onOptionSelected={(option) => {
              if (option) onLink(option)
            }}
          />
        </FormField>

        <p className="text-xs font-medium uppercase tracking-wide text-[var(--foreground)]/55">
          or create new
        </p>

        <ManagementCompanyCellsSection
          form={value.mcForm}
          editable={!disabled && mode !== "link"}
          onFieldChange={onMcFieldChange}
        />
      </div>
    </div>
  )
}
