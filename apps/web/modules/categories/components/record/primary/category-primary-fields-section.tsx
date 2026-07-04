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
import { formatEasternDateTime, type Category, type CategoryStats } from "@builders/domain"

// Read-only category detail. Category is a seed-sourced reference table with no
// user CRUD yet — every field is static; the only interaction is Close.
export function CategoryPrimaryFieldsSection({
  category,
  stats,
}: {
  category: Category
  stats: CategoryStats
}) {
  return (
    <div className="flex flex-col gap-4">
      <RecordColumnBreak
        split="right-narrow"
        left={
          <FieldSection gap="0.75rem">
            <CellAt col={1} colSpan={8}>
              <FormField label="Name">
                <StaticFieldValue>{category.name}</StaticFieldValue>
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
          </FieldSection>
        }
      />
      <RecordSectionDivider />
      <FieldSection gap="0.75rem">
        <CellAt col={1} colSpan={4}>
          <FormField label="Created">
            <StaticFieldValue>{formatEasternDateTime(category.createdAt) || "—"}</StaticFieldValue>
          </FormField>
        </CellAt>
        <CellAt col={5} colSpan={4}>
          <FormField label="Updated">
            <StaticFieldValue>{formatEasternDateTime(category.updatedAt) || "—"}</StaticFieldValue>
          </FormField>
        </CellAt>
      </FieldSection>
    </div>
  )
}
