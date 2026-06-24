"use client"

import type { ReactNode } from "react"
import type { PropertyPrimaryForm } from "@builders/domain"
import { AddressEditCell, CellAt, FieldSection, FormField, PhoneCell, TextCell, TextareaCell } from "@/engines/record-view"

/**
 * The text/address fields rendered by this section — the shared subset common
 * to the property record view (`PropertyPrimaryForm`, which adds an unrendered
 * `entityId` that rides along on save) and the management hub create
 * form (`PropertyHubPropertyFields`). Both are assignable to this shape, so a
 * single component serves both instead of two hand-mirrored copies.
 */
export type PropertyFieldsDraft = Pick<
  PropertyPrimaryForm,
  "name" | "streetAddress" | "city" | "state" | "zip" | "phone" | "email" | "instructions"
>

/**
 * The editable property fields: name, contact, address, and instructions —
 * shared by the property record view's §1 and the management hub create form's
 * "Property" group. Chrome-free (just the field grid); each consumer supplies
 * its own section shell. The linked/selected entity is handled
 * outside this block, so the draft's `entityId` (record view) is
 * left untouched here.
 *
 * Layout: every field stacked one-per-row at col 1, each spanning 5/8 columns,
 * with Email below Phone.
 */
export function PropertyFieldsSection({
  draft,
  editable,
  onFieldChange,
  ariaPrefix = "Property",
  showContact = true,
  nameRowTrailing,
}: {
  draft: PropertyFieldsDraft
  editable: boolean
  onFieldChange: (field: keyof PropertyFieldsDraft, value: string) => void
  /** Prefix for the fields' aria-labels, e.g. "Property" → "Property phone". */
  ariaPrefix?: string
  /**
   * Render the Phone + Email cells. Default `true` (full form). The quick-create
   * modal passes `false` to trim contact fields down to name/address/instructions.
   */
  showContact?: boolean
  /**
   * Optional cell placed to the right of the Name field (col 6, spanning 3/8).
   * The record view drops the read-only Property # here; the hub forms omit it.
   */
  nameRowTrailing?: ReactNode
}) {
  const onText = (field: keyof PropertyFieldsDraft) => (value: string) => onFieldChange(field, value)

  return (
    <FieldSection gap="0.75rem">
      <CellAt col={1} colSpan={5}>
        <FormField label="Property Name" required>
          <TextCell
            editable={editable}
            value={draft.name}
            onChange={onText("name")}
            placeholder="Property name"
            ariaLabel={`${ariaPrefix} name`}
          />
        </FormField>
      </CellAt>
      {nameRowTrailing ? (
        <CellAt col={6} colSpan={3}>
          {nameRowTrailing}
        </CellAt>
      ) : null}
      {showContact ? (
        <>
          <CellAt col={1} colSpan={5}>
            <FormField label="Phone">
              <PhoneCell
                editable={editable}
                value={draft.phone}
                onChange={onText("phone")}
                ariaLabel={`${ariaPrefix} phone`}
              />
            </FormField>
          </CellAt>
          <CellAt col={1} colSpan={5}>
            <FormField label="Email">
              <TextCell
                editable={editable}
                value={draft.email}
                onChange={onText("email")}
                placeholder="Email"
                ariaLabel={`${ariaPrefix} email`}
              />
            </FormField>
          </CellAt>
        </>
      ) : null}
      <AddressEditCell
        editable={editable}
        colSpan={5}
        ariaPrefix={ariaPrefix}
        value={{
          streetAddress: draft.streetAddress,
          city: draft.city,
          state: draft.state,
          zip: draft.zip,
        }}
        onChange={(field, value) => onFieldChange(field, value)}
      />
      <CellAt col={1} colSpan={5}>
        <FormField label="Instructions">
          <TextareaCell
            editable={editable}
            value={draft.instructions}
            onChange={onText("instructions")}
            placeholder="Instructions"
            ariaLabel={`${ariaPrefix} instructions`}
            rows={3}
          />
        </FormField>
      </CellAt>
    </FieldSection>
  )
}
