"use client"

import { formatPhoneNumber, type ManagementCompanyForm, type ManagementCompanyOption } from "@builders/domain"
import {
  AddressEditCell,
  CellAt,
  FieldSection,
  FormField,
  RecordOpenButton,
  StaticFieldValue,
} from "@/engines/record-view"
import { ManagementCompanyPicker } from "@/modules/management-companies/components/picker/management-company-picker"
import { ManagementCompanyCreateMenu } from "@/modules/management-companies/components/picker/management-company-create-menu"

/**
 * The Property record view's §1 management-company block — always shown. The
 * Company-Name cell is the live MC picker (tracked by the property's primary
 * controller, so a pick is a dirty edit that saves with the property). The
 * `RecordOpenButton` (launch ↗) sits inline on the cell label and hands off to
 * the selected MC's record view; the ⋮ `ManagementCompanyCreateMenu` beside it
 * spins up a new company (quick modal or proper page) that fills the cell. Phone /
 * Email / Address always render read-only ("—" when empty) and refresh from
 * `display` when a new company is picked.
 */
export function ManagementCompanyPickerSection({
  value,
  onChange,
  onOptionSelected,
  selectedLabel,
  display,
  editable,
  onOpen,
  initialOptions,
  returnTo,
  onCreated,
}: {
  value: string | null
  onChange: (id: string | null) => void
  onOptionSelected: (option: ManagementCompanyOption | null) => void
  selectedLabel: string | null
  display: ManagementCompanyForm | null
  editable: boolean
  onOpen: () => void
  initialOptions?: ManagementCompanyOption[]
  /** Record-entry path the create menu's proper-form route returns to. */
  returnTo: string
  /** Fired with a freshly created company, mapped to a `ManagementCompanyOption`. */
  onCreated: (option: ManagementCompanyOption) => void
}) {
  return (
    <FieldSection gap="0.75rem">
      <CellAt col={1} colSpan={5}>
        <FormField
          label="Company Name"
          required
          actions={
            <>
              <RecordOpenButton
                ariaLabel="Open management company"
                title="Open management company"
                disabled={!value}
                onClick={onOpen}
              />
              {editable ? (
                <ManagementCompanyCreateMenu returnTo={returnTo} onCreated={onCreated} />
              ) : null}
            </>
          }
        >
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
