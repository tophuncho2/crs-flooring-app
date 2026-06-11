"use client"

import type { ManufacturerStats } from "@builders/domain"
import { CellAt, FieldSection, FormField, RecordItemSection, StatCell } from "@/engines/record-view"

export type ManufacturerStatisticsSectionProps = {
  stats: ManufacturerStats
}

/**
 * Read-only totals for the manufacturer: counts of linked products and imports.
 * Renders on the record-view invisible grid via `StatCell`. No controller / no
 * mutations — the panel mounts it as a `type: "item"` section.
 */
export function ManufacturerStatisticsSection({ stats }: ManufacturerStatisticsSectionProps) {
  return (
    <RecordItemSection title="Statistics">
      <FieldSection gap="0.75rem">
        <CellAt col={1} colSpan={4}>
          <FormField label="Products">
            <StatCell value={stats.productsCount} ariaLabel="Linked products total" />
          </FormField>
        </CellAt>
        <CellAt col={5} colSpan={4}>
          <FormField label="Imports">
            <StatCell value={stats.importsCount} ariaLabel="Linked imports total" />
          </FormField>
        </CellAt>
      </FieldSection>
    </RecordItemSection>
  )
}
