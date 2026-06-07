"use client"

import type { PropertyHubPropertyFields } from "@builders/domain"
import { CellAt } from "@/components/layout-grid"
import { FieldSection, FormField } from "@/components/fields"
import { TextCell, TextareaCell } from "@/components/cells"
import { AddressEditCell } from "@/components/composites/address-fields/address-edit-cell"

/**
 * The property fields for the hub create form (no MC picker — the management
 * company is chosen in the separate MC select section). Standard 8-col field
 * layout, lifted from the retired hub side panel's property create section.
 */
export function PropertyCreateFieldsSection({
  draft,
  editable,
  onFieldChange,
}: {
  draft: PropertyHubPropertyFields
  editable: boolean
  onFieldChange: <K extends keyof PropertyHubPropertyFields>(
    field: K,
    value: PropertyHubPropertyFields[K],
  ) => void
}) {
  const onText =
    <K extends keyof PropertyHubPropertyFields>(field: K) =>
    (value: string) => {
      onFieldChange(field, value as PropertyHubPropertyFields[K])
    }

  return (
    <FieldSection gap="0.75rem">
      <CellAt col={1} colSpan={8}>
        <FormField label="Property Name" required>
          <TextCell
            editable={editable}
            value={draft.name}
            onChange={onText("name")}
            placeholder="Property name"
            ariaLabel="Property name"
          />
        </FormField>
      </CellAt>
      <CellAt col={1} colSpan={4}>
        <FormField label="Phone">
          <TextCell
            editable={editable}
            value={draft.phone}
            onChange={onText("phone")}
            placeholder="Phone"
            ariaLabel="Property phone"
          />
        </FormField>
      </CellAt>
      <CellAt col={5} colSpan={4}>
        <FormField label="Email">
          <TextCell
            editable={editable}
            value={draft.email}
            onChange={onText("email")}
            placeholder="Email"
            ariaLabel="Property email"
          />
        </FormField>
      </CellAt>
      <AddressEditCell
        editable={editable}
        ariaPrefix="Property"
        value={{
          streetAddress: draft.streetAddress,
          city: draft.city,
          state: draft.state,
          zip: draft.zip,
        }}
        onChange={(field, value) => onFieldChange(field, value)}
      />
      <CellAt col={1} colSpan={8}>
        <FormField label="Instructions">
          <TextareaCell
            editable={editable}
            value={draft.instructions}
            onChange={onText("instructions")}
            placeholder="Instructions"
            ariaLabel="Property instructions"
            rows={3}
          />
        </FormField>
      </CellAt>
    </FieldSection>
  )
}
