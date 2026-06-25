"use client"

import { formatPhoneNumber, type EntityForm, type EntityTypeRef } from "@builders/domain"
import {
  AddressEditCell,
  CellAt,
  FieldSection,
  FormField,
  PhoneCell,
  StaticFieldValue,
  TextCell,
} from "@/engines/record-view"
import { EntityTypeMultiSelect } from "@/modules/entity-types/components/picker/entity-type-multi-select"

/**
 * A single labeled text field in the entity cells grid. Editable renders the live
 * `TextCell` input; read-only renders the boxed `StaticFieldValue` so the value
 * reads as a filled cell (matching the Address cell and the app-wide read-only
 * convention) rather than a bare line of text.
 */
function CellTextField({
  label,
  required,
  editable,
  value,
  onChange,
  placeholder,
  ariaLabel,
}: {
  label: string
  required?: boolean
  editable: boolean
  value: string
  onChange: (value: string) => void
  placeholder: string
  ariaLabel: string
}) {
  return (
    <FormField label={label} required={required}>
      {editable ? (
        <TextCell
          editable
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          ariaLabel={ariaLabel}
        />
      ) : (
        <StaticFieldValue>{value || "—"}</StaticFieldValue>
      )}
    </FormField>
  )
}

/**
 * The Entity "cells" field grid — the shared §1 layout that renders
 * **identically** on the entity record view (editable, its own primary) and the
 * Property record view (read-only, the linked entity). Edit modality is the only
 * difference; pass `editable` + `onFieldChange` to drive it. The section shell
 * (title / save chrome) is supplied by the consumer.
 *
 * Layout: Entity Name · Phone · Email · Address stacked one-per-row, each
 * spanning 5/8 columns (address cell included).
 */
export function EntityCellsSection({
  form,
  editable,
  onFieldChange,
  showContactAndAddress = true,
  showTypes = false,
  seedTypeRefs = [],
  onTypeIdsChange,
  cellSpan = 5,
}: {
  form: EntityForm
  editable: boolean
  onFieldChange?: <K extends keyof EntityForm>(
    field: K,
    value: EntityForm[K],
  ) => void
  /**
   * Render the Phone, Email, and Address cells. Default `true` (full form). The
   * quick-create modal passes `false` to trim the "create new entity" cells down to
   * Entity Name only.
   */
  showContactAndAddress?: boolean
  /**
   * Render the entity-type array picker on the right half. Default `false`. The
   * entity record view + standalone create form pass `true`; the quick-create and
   * property-hub-create entity sub-forms leave it off.
   */
  showTypes?: boolean
  /** The record's current type refs — seeds chip labels for the picker. */
  seedTypeRefs?: EntityTypeRef[]
  /** Editable-types handler. When omitted, the picker renders read-only. */
  onTypeIdsChange?: (nextIds: string[]) => void
  /**
   * Width (in 8-col grid units) of the stacked left-column cells. Defaults to
   * `5/8` (the historic layout that left room for the inline Types cell at col
   * 6). The entity record view passes `8` so the cells fill the full left flank
   * up to its column break (Types now lives on the break's right side).
   */
  cellSpan?: number
}) {
  const onText =
    <K extends keyof EntityForm>(field: K) =>
    (value: string) => {
      onFieldChange?.(field, value as EntityForm[K])
    }

  return (
    <FieldSection gap="0.75rem">
      <CellAt col={1} colSpan={cellSpan}>
        <CellTextField
          label="Entity Name"
          required
          editable={editable}
          value={form.entity}
          onChange={onText("entity")}
          placeholder="Entity name"
          ariaLabel="Entity name"
        />
      </CellAt>
      {showTypes ? (
        <CellAt col={6} colSpan={3}>
          <FormField label="Types">
            <EntityTypeMultiSelect
              selectedIds={form.typeIds}
              seedRefs={seedTypeRefs}
              editable={editable && Boolean(onTypeIdsChange)}
              onChange={onTypeIdsChange}
            />
          </FormField>
        </CellAt>
      ) : null}
      {showContactAndAddress ? (
        <>
          <CellAt col={1} colSpan={cellSpan}>
            <FormField label="Phone">
              {editable ? (
                <PhoneCell
                  editable
                  value={form.phone}
                  onChange={onText("phone")}
                  ariaLabel="Phone"
                />
              ) : (
                <StaticFieldValue>{formatPhoneNumber(form.phone) || "—"}</StaticFieldValue>
              )}
            </FormField>
          </CellAt>
          <CellAt col={1} colSpan={cellSpan}>
            <CellTextField
              label="Email"
              editable={editable}
              value={form.email}
              onChange={onText("email")}
              placeholder="Email"
              ariaLabel="Email"
            />
          </CellAt>
          <AddressEditCell
            editable={editable}
            colSpan={cellSpan}
            value={{
              streetAddress: form.streetAddress,
              city: form.city,
              state: form.state,
              zip: form.zip,
            }}
            onChange={(field, value) => onFieldChange?.(field, value)}
          />
        </>
      ) : null}
    </FieldSection>
  )
}
