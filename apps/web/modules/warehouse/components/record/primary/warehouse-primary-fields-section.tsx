"use client"

import { normalizeAddressState, type WarehouseForm } from "@builders/domain"
import { TextCell } from "@/engines/record-view"
import { FieldSection, FormField, StaticFieldValue } from "@/engines/record-view"
import { CellAt } from "@/engines/record-view"

function formatDate(value: string) {
  if (!value) return "—"
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value
  return parsed.toISOString().slice(0, 10)
}

export type WarehousePrimaryFieldsSectionProps = {
  draft: WarehouseForm
  editable: boolean
  onFieldChange: (field: keyof WarehouseForm, value: string) => void
  /** Read-only summary shown in the detail view; omit in the create flow. */
  number?: number
  createdAt?: string
  updatedAt?: string
}

export function WarehousePrimaryFieldsSection({
  draft,
  editable,
  onFieldChange,
  number,
  createdAt,
  updatedAt,
}: WarehousePrimaryFieldsSectionProps) {
  const showSummary = number !== undefined

  return (
    <FieldSection gap="0.75rem">
      <CellAt col={1} colSpan={5}>
        <FormField label="Warehouse Name" required>
          <TextCell
            editable={editable}
            value={draft.name}
            onChange={(next) => onFieldChange("name", next)}
            placeholder="Warehouse"
            ariaLabel="Warehouse name"
          />
        </FormField>
      </CellAt>
      <CellAt col={6} colSpan={3}>
        <FormField label="Store Phone">
          <TextCell
            editable={editable}
            value={draft.phone}
            onChange={(next) => onFieldChange("phone", next)}
            placeholder="Store phone"
            ariaLabel="Warehouse phone"
          />
        </FormField>
      </CellAt>
      <CellAt col={1} colSpan={8}>
        <FormField label="Street Address">
          <TextCell
            editable={editable}
            value={draft.streetAddress}
            onChange={(next) => onFieldChange("streetAddress", next)}
            placeholder="Street address"
            ariaLabel="Warehouse street address"
          />
        </FormField>
      </CellAt>
      <CellAt col={1} colSpan={4}>
        <FormField label="City">
          <TextCell
            editable={editable}
            value={draft.city}
            onChange={(next) => onFieldChange("city", next)}
            placeholder="City"
            ariaLabel="Warehouse city"
          />
        </FormField>
      </CellAt>
      <CellAt col={5} colSpan={2}>
        <FormField label="State">
          <TextCell
            editable={editable}
            value={draft.state}
            onChange={(next) => onFieldChange("state", normalizeAddressState(next))}
            placeholder="ST"
            ariaLabel="Warehouse state"
          />
        </FormField>
      </CellAt>
      <CellAt col={7} colSpan={2}>
        <FormField label="Postal Code">
          <TextCell
            editable={editable}
            value={draft.postalCode}
            onChange={(next) => onFieldChange("postalCode", next)}
            placeholder="Postal code"
            ariaLabel="Warehouse postal code"
          />
        </FormField>
      </CellAt>
      {showSummary ? (
        <>
          <CellAt col={1} colSpan={2}>
            <FormField label="Warehouse #">
              <StaticFieldValue>{number ?? "—"}</StaticFieldValue>
            </FormField>
          </CellAt>
          <CellAt col={3} colSpan={3}>
            <FormField label="Created">
              <StaticFieldValue>{formatDate(createdAt ?? "")}</StaticFieldValue>
            </FormField>
          </CellAt>
          <CellAt col={6} colSpan={3}>
            <FormField label="Updated">
              <StaticFieldValue>{formatDate(updatedAt ?? "")}</StaticFieldValue>
            </FormField>
          </CellAt>
        </>
      ) : null}
    </FieldSection>
  )
}
