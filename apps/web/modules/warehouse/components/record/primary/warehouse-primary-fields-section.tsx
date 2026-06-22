"use client"

import type { WarehouseForm } from "@builders/domain"
import {
  AddressEditCell,
  CellAt,
  FieldSection,
  FormField,
  PhoneCell,
  StaticFieldValue,
  TextCell,
} from "@/engines/record-view"

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
  /** Read-only STORE-N number shown in the detail view; omit in the create flow (DB-generated). */
  warehouseNumber?: string
  /** Read-only summary shown in the detail view; omit in the create flow. */
  createdAt?: string
  updatedAt?: string
}

export function WarehousePrimaryFieldsSection({
  draft,
  editable,
  onFieldChange,
  warehouseNumber,
  createdAt,
  updatedAt,
}: WarehousePrimaryFieldsSectionProps) {
  const showSummary = createdAt !== undefined || updatedAt !== undefined

  return (
    <FieldSection gap="0.75rem">
      {warehouseNumber ? (
        <CellAt col={1} colSpan={5}>
          <FormField label="Store #">
            <StaticFieldValue>{warehouseNumber}</StaticFieldValue>
          </FormField>
        </CellAt>
      ) : null}
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
      <CellAt col={1} colSpan={5}>
        <FormField label="Store Phone">
          <PhoneCell
            editable={editable}
            value={draft.phone}
            onChange={(next) => onFieldChange("phone", next)}
            ariaLabel="Warehouse phone"
          />
        </FormField>
      </CellAt>
      <AddressEditCell
        editable={editable}
        colSpan={5}
        ariaPrefix="Warehouse"
        value={{
          streetAddress: draft.streetAddress,
          city: draft.city,
          state: draft.state,
          zip: draft.postalCode,
        }}
        onChange={(field, value) => onFieldChange(field === "zip" ? "postalCode" : field, value)}
      />
      {showSummary ? (
        <>
          <CellAt col={1} colSpan={5}>
            <FormField label="Created">
              <StaticFieldValue>{formatDate(createdAt ?? "")}</StaticFieldValue>
            </FormField>
          </CellAt>
          <CellAt col={1} colSpan={5}>
            <FormField label="Updated">
              <StaticFieldValue>{formatDate(updatedAt ?? "")}</StaticFieldValue>
            </FormField>
          </CellAt>
        </>
      ) : null}
    </FieldSection>
  )
}
