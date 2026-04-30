"use client"

import { CellAt } from "@/components/layout-grid"
import { FormField, StaticFieldValue } from "@/components/fields"
import { buildAddressBlock } from "@builders/domain"

export type PropertyJoinedFields = {
  streetAddress: string
  city: string
  state: string
  postalCode: string
  instructions: string
}

/**
 * Two read-only cells (address + instructions) driven by the currently
 * selected property's joined fields. Both fall back to "—" when no
 * property is selected or the field is empty.
 *
 * Consumers do their own option lookup (e.g.
 * `propertyOptions.find(o => o.id === draft.propertyId)`) and pass the
 * joined fields here so the cells track the live dropdown selection
 * rather than the saved record.
 */
export function PropertyJoinedReadOnlyCells({
  property,
  startRow,
  startCol = 1,
  colSpan = 8,
}: {
  property: PropertyJoinedFields | null
  startRow: number
  startCol?: number
  colSpan?: number
}) {
  const formattedAddress = property
    ? buildAddressBlock({
        streetAddress: property.streetAddress || null,
        city: property.city || null,
        state: property.state || null,
        postalCode: property.postalCode || null,
      })
    : ""
  const addressDisplay = formattedAddress || "—"
  const instructionsDisplay = property?.instructions || "—"

  return (
    <>
      <CellAt col={startCol} row={startRow} colSpan={colSpan}>
        <FormField label="Property Address (read-only)">
          <StaticFieldValue>
            <span className="whitespace-pre-line">{addressDisplay}</span>
          </StaticFieldValue>
        </FormField>
      </CellAt>
      <CellAt col={startCol} row={startRow + 1} colSpan={colSpan}>
        <FormField label="Property Instructions (read-only)">
          <StaticFieldValue>
            <span className="whitespace-pre-line">{instructionsDisplay}</span>
          </StaticFieldValue>
        </FormField>
      </CellAt>
    </>
  )
}
