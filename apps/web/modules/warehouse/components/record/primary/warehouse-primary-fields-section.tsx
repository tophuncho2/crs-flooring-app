"use client"

import { formatEasternDateTime, type WarehouseForm, type WarehouseStats } from "@builders/domain"
import {
  AddressEditCell,
  CellAt,
  FieldSection,
  FormField,
  PhoneCell,
  RecordColumnBreak,
  RecordSectionDivider,
  StatCell,
  StaticFieldValue,
  TextCell,
} from "@/engines/record-view"

export type WarehousePrimaryFieldsSectionProps = {
  draft: WarehouseForm
  editable: boolean
  onFieldChange: (field: keyof WarehouseForm, value: string) => void
  /** Read-only STORE-N number shown in the detail view; omit in the create flow (DB-generated). */
  warehouseNumber?: string
  /** Read-only summary shown in the detail view; omit in the create flow. */
  createdAt?: string
  updatedAt?: string
  createdBy?: string | null
  updatedBy?: string | null
  /** Linked-row counts shown in the detail view's right flank; omit in the create flow. */
  stats?: WarehouseStats
}

export function WarehousePrimaryFieldsSection({
  draft,
  editable,
  onFieldChange,
  warehouseNumber,
  createdAt,
  updatedAt,
  createdBy,
  updatedBy,
  stats,
}: WarehousePrimaryFieldsSectionProps) {
  const showSummary = createdAt !== undefined || updatedAt !== undefined

  // The editable cluster is shared by both flows; the create flow stays a single
  // narrow column (span 5), while the detail flow's left flank fills its column (span 8).
  const renderEditableFields = (span: number) => (
    <>
      {warehouseNumber ? (
        <CellAt col={1} colSpan={span}>
          <FormField label="Store #">
            <StaticFieldValue>{warehouseNumber}</StaticFieldValue>
          </FormField>
        </CellAt>
      ) : null}
      <CellAt col={1} colSpan={span}>
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
      <CellAt col={1} colSpan={span}>
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
        colSpan={span}
        ariaPrefix="Warehouse"
        value={{
          streetAddress: draft.streetAddress,
          city: draft.city,
          state: draft.state,
          zip: draft.postalCode,
        }}
        onChange={(field, value) => onFieldChange(field === "zip" ? "postalCode" : field, value)}
      />
    </>
  )

  // Create flow: no stats / no summary — keep the original single-column form.
  if (!showSummary) {
    return <FieldSection gap="0.75rem">{renderEditableFields(5)}</FieldSection>
  }

  // Detail flow: editable fields left, linked-row counts stacked right, then a
  // divider over the read-only snapshot + actor metadata band.
  return (
    <div className="flex flex-col gap-4">
      <RecordColumnBreak
        split="right-narrow"
        left={<FieldSection gap="0.75rem">{renderEditableFields(8)}</FieldSection>}
        right={
          <FieldSection gap="0.75rem">
            <CellAt col={1} colSpan={8}>
              <FormField label="Templates">
                <StatCell value={stats?.templatesCount ?? 0} ariaLabel="Linked templates total" />
              </FormField>
            </CellAt>
            <CellAt col={1} colSpan={8}>
              <FormField label="Work Orders">
                <StatCell
                  value={stats?.workOrdersCount ?? 0}
                  ariaLabel="Linked work orders total"
                />
              </FormField>
            </CellAt>
            <CellAt col={1} colSpan={8}>
              <FormField label="Imports">
                <StatCell value={stats?.importsCount ?? 0} ariaLabel="Linked imports total" />
              </FormField>
            </CellAt>
          </FieldSection>
        }
      />
      <RecordSectionDivider />
      <FieldSection gap="0.75rem">
        <CellAt col={1} colSpan={4}>
          <FormField label="Created">
            <StaticFieldValue>{formatEasternDateTime(createdAt) || "—"}</StaticFieldValue>
          </FormField>
        </CellAt>
        <CellAt col={5} colSpan={4}>
          <FormField label="Updated">
            <StaticFieldValue>{formatEasternDateTime(updatedAt) || "—"}</StaticFieldValue>
          </FormField>
        </CellAt>
        <CellAt col={1} colSpan={4}>
          <FormField label="Created by">
            <StaticFieldValue>{createdBy ?? "—"}</StaticFieldValue>
          </FormField>
        </CellAt>
        <CellAt col={5} colSpan={4}>
          <FormField label="Updated by">
            <StaticFieldValue>{updatedBy ?? "—"}</StaticFieldValue>
          </FormField>
        </CellAt>
      </FieldSection>
    </div>
  )
}
