"use client"

import {
  CellAt,
  FieldSection,
  FormField,
  RecordColumnBreak,
  RecordSectionDivider,
  StatCell,
  StaticFieldValue,
} from "@/engines/record-view"
import {
  formatEasternDateTime,
  type UnitOfMeasure,
  type UnitOfMeasureStats,
} from "@builders/domain"

// Read-only unit-of-measure detail. UoM is a seed-sourced reference table with
// no user CRUD yet — every field is static; the only interaction is Close.
export function UnitOfMeasurePrimaryFieldsSection({
  unitOfMeasure,
  stats,
}: {
  unitOfMeasure: UnitOfMeasure
  stats: UnitOfMeasureStats
}) {
  return (
    <div className="flex flex-col gap-4">
      <RecordColumnBreak
        split="right-narrow"
        left={
          <FieldSection gap="0.75rem">
            <CellAt col={1} colSpan={4}>
              <FormField label="Name">
                <StaticFieldValue>{unitOfMeasure.name}</StaticFieldValue>
              </FormField>
            </CellAt>
            <CellAt col={5} colSpan={4}>
              <FormField label="Abbreviation">
                <StaticFieldValue>{unitOfMeasure.abbreviation}</StaticFieldValue>
              </FormField>
            </CellAt>
          </FieldSection>
        }
        right={
          <FieldSection gap="0.75rem">
            <CellAt col={1} colSpan={8}>
              <FormField label="Products">
                <StatCell value={stats.productsCount} ariaLabel="Linked products total" />
              </FormField>
            </CellAt>
            <CellAt col={1} colSpan={8}>
              <FormField label="In use by">
                <StatCell value={stats.totalUsage} ariaLabel="Total records using this unit" />
              </FormField>
            </CellAt>
          </FieldSection>
        }
      />
      <RecordSectionDivider />
      <FieldSection gap="0.75rem">
        <CellAt col={1} colSpan={4}>
          <FormField label="Created">
            <StaticFieldValue>
              {formatEasternDateTime(unitOfMeasure.createdAt) || "—"}
            </StaticFieldValue>
          </FormField>
        </CellAt>
        <CellAt col={5} colSpan={4}>
          <FormField label="Updated">
            <StaticFieldValue>
              {formatEasternDateTime(unitOfMeasure.updatedAt) || "—"}
            </StaticFieldValue>
          </FormField>
        </CellAt>
      </FieldSection>
    </div>
  )
}
