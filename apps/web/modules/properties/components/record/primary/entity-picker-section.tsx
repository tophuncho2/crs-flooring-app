"use client"

import { formatPhoneNumber, type EntityForm, type EntityOption } from "@builders/domain"
import {
  AddressEditCell,
  CellAt,
  FieldSection,
  FormField,
  RecordOpenButton,
  StaticFieldValue,
} from "@/engines/record-view"
import { EntityPicker } from "@/modules/entities/components/picker/entity-picker"
import { EntityCreateMenu } from "@/modules/entities/components/picker/entity-create-menu"

/**
 * The Property record view's §1 entity block — always shown. The
 * Company-Name cell is the live entity picker (tracked by the property's primary
 * controller, so a pick is a dirty edit that saves with the property). The
 * `RecordOpenButton` (launch ↗) sits inline on the cell label and hands off to
 * the selected entity's record view; the ⋮ `EntityCreateMenu` beside it
 * spins up a new company (quick modal or proper page) that fills the cell. Phone /
 * Email / Address always render read-only ("—" when empty) and refresh from
 * `display` when a new company is picked.
 */
export function EntityPickerSection({
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
  onOptionSelected: (option: EntityOption | null) => void
  selectedLabel: string | null
  display: EntityForm | null
  editable: boolean
  onOpen: () => void
  initialOptions?: EntityOption[]
  /** Record-entry path the create menu's proper-form route returns to. */
  returnTo: string
  /** Fired with a freshly created company, mapped to a `EntityOption`. */
  onCreated: (option: EntityOption) => void
}) {
  return (
    <FieldSection gap="0.75rem">
      <CellAt col={1} colSpan={5}>
        <FormField
          label="Entity"
          required
          actions={
            <>
              <RecordOpenButton
                ariaLabel="Open entity"
                title="Open entity"
                disabled={!value}
                onClick={onOpen}
              />
              {editable ? (
                <EntityCreateMenu returnTo={returnTo} onCreated={onCreated} />
              ) : null}
            </>
          }
        >
          <EntityPicker
            value={value}
            onChange={onChange}
            onOptionSelected={onOptionSelected}
            selectedLabel={selectedLabel}
            placeholder="Select entity"
            ariaLabel="Entity"
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
