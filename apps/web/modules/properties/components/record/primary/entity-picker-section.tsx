"use client"

import {
  formatPhoneNumber,
  type EntityForm,
  type EntityOption,
  type EntityTypeRef,
  type PaletteColor,
} from "@builders/domain"
import {
  AddressEditCell,
  CellAt,
  FieldSection,
  FormField,
  RecordOpenButton,
  StaticFieldValue,
} from "@/engines/record-view"
import { CellAddButton, CellChip, PaletteColorDropdown } from "@/engines/common"
import { EntityTypePicker } from "@/modules/entities/components/picker/entity-type-picker"
import { EntityTypeMultiSelect } from "@/modules/entity-types/components/picker/entity-type-multi-select"

/**
 * The Property record view's §1 entity block — always shown. The
 * Company-Name cell is the live entity picker (tracked by the property's primary
 * controller, so a pick is a dirty edit that saves with the property). The
 * `RecordOpenButton` (launch ↗) sits inline on the cell label and hands off to
 * the selected entity's record view; the `CellAddButton` (+) beside it opens the
 * proper entity create form (no quick modal). Phone / Email / Address always
 * render read-only ("—" when empty) and refresh from `display` when a new company
 * is picked.
 */
export function EntityPickerSection({
  value,
  onChange,
  onOptionSelected,
  selectedLabel,
  display,
  typeRefs,
  entityNumber,
  entityColor,
  editable,
  onOpen,
  initialOptions,
  onCreate,
}: {
  value: string | null
  onChange: (id: string | null) => void
  onOptionSelected: (option: EntityOption | null) => void
  selectedLabel: string | null
  display: EntityForm | null
  /** The linked entity's type(s), rendered read-only as palette chips. */
  typeRefs: EntityTypeRef[]
  /** The linked entity's ENT-# (read-only chip), or null when none / mid-re-pick. */
  entityNumber: string | null
  /** The linked entity's palette color (read-only swatch + tints the ENT-# chip). */
  entityColor: PaletteColor | null
  editable: boolean
  onOpen: () => void
  initialOptions?: EntityOption[]
  /** Opens the proper entity create form (the `+` affordance). */
  onCreate: () => void
}) {
  return (
    <FieldSection gap="0.75rem">
      {/* Linked entity's ENT-# + color, read-only, mirroring the entity record
          view's name-row leading/trailing chips (above the Entity cell). */}
      <CellAt col={1} colSpan={4}>
        <FormField label="ENT #">
          {entityNumber ? (
            <CellChip paletteColor={entityColor ?? undefined}>{entityNumber}</CellChip>
          ) : (
            <StaticFieldValue>—</StaticFieldValue>
          )}
        </FormField>
      </CellAt>
      <CellAt col={5} colSpan={4}>
        <FormField label="Color">
          {entityColor ? (
            <PaletteColorDropdown
              value={entityColor}
              editable={false}
              onChange={() => {}}
              ariaLabel="Entity color"
            />
          ) : (
            <StaticFieldValue>—</StaticFieldValue>
          )}
        </FormField>
      </CellAt>
      <CellAt col={1} colSpan={8}>
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
                <CellAddButton ariaLabel="New entity" title="New entity" onClick={onCreate} />
              ) : null}
            </>
          }
        >
          <EntityTypePicker
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
      <CellAt col={1} colSpan={8}>
        <FormField label="Types">
          <EntityTypeMultiSelect selectedIds={typeRefs.map((ref) => ref.id)} seedRefs={typeRefs} editable={false} />
        </FormField>
      </CellAt>
      <CellAt col={1} colSpan={8}>
        <FormField label="Phone">
          <StaticFieldValue>{(display && formatPhoneNumber(display.phone)) || "—"}</StaticFieldValue>
        </FormField>
      </CellAt>
      <CellAt col={1} colSpan={8}>
        <FormField label="Email">
          <StaticFieldValue>{display?.email || "—"}</StaticFieldValue>
        </FormField>
      </CellAt>
      <AddressEditCell
        editable={false}
        colSpan={8}
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
