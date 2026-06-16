"use client"

import { formatPhoneNumber, type ManagementCompanyForm, type ManagementCompanyOption } from "@builders/domain"
import {
  AddressEditCell,
  CellAt,
  FieldSection,
  FormField,
  StaticFieldValue,
} from "@/engines/record-view"
import { ManagementCompanyPicker } from "@/modules/management-companies/components/picker/management-company-picker"

/**
 * The Property record view's §1 management-company block — always shown. The
 * Company-Name cell is the live MC picker (tracked by the property's primary
 * controller, so a pick is a dirty edit that saves with the property). Phone /
 * Email / Address always render read-only ("—" when empty) and refresh from
 * `display` when a new company is picked.
 *
 * NOTE: the inline record-open affordance is temporarily removed — this branch
 * predates the `RecordOpenButton` (launch ↗) primitive that retired
 * `CellOpenButton`. Re-add it on the label's `actions` slot after the rebase.
 */
export function ManagementCompanyPickerSection({
  value,
  onChange,
  onOptionSelected,
  selectedLabel,
  display,
  editable,
  initialOptions,
}: {
  value: string | null
  onChange: (id: string | null) => void
  onOptionSelected: (option: ManagementCompanyOption | null) => void
  selectedLabel: string | null
  display: ManagementCompanyForm | null
  editable: boolean
  initialOptions?: ManagementCompanyOption[]
}) {
  return (
    <FieldSection gap="0.75rem">
      <CellAt col={1} colSpan={5}>
        <FormField label="Company Name" required>
          <ManagementCompanyPicker
            value={value}
            onChange={onChange}
            onOptionSelected={onOptionSelected}
            selectedLabel={selectedLabel}
            placeholder="Select company"
            ariaLabel="Company name"
            disabled={!editable}
            initialOptions={initialOptions}
          />
        </FormField>
      </CellAt>
      <CellAt col={1} colSpan={5}>
        <FormField label="Phone">
          <StaticFieldValue>{(display && formatPhoneNumber(display.phone)) || "—"}</StaticFieldValue>
        </FormField>
      </CellAt>
      <CellAt col={1} colSpan={5}>
        <FormField label="Email">
          <StaticFieldValue>{display?.email || "—"}</StaticFieldValue>
        </FormField>
      </CellAt>
      <AddressEditCell
        editable={false}
        colSpan={5}
        value={{
          streetAddress: display?.streetAddress ?? "",
          city: display?.city ?? "",
          state: display?.state ?? "",
          zip: display?.zip ?? "",
        }}
        onChange={() => {}}
      />
    </FieldSection>
  )
}
