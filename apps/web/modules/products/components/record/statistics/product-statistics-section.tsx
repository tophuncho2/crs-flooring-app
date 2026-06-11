"use client"

import type { ProductStats } from "@builders/domain"
import { CellAt, FieldSection, FormField, RecordItemSection, StatCell } from "@/engines/record-view"

export type ProductStatisticsSectionProps = {
  stats: ProductStats
}

/**
 * Read-only totals for the product: counts of linked template items, work-order
 * items, inventory rows, and adjustments. Renders on the record-view invisible
 * grid via `StatCell`. No controller / no mutations — the panel mounts it as a
 * `type: "item"` section.
 */
export function ProductStatisticsSection({ stats }: ProductStatisticsSectionProps) {
  return (
    <RecordItemSection title="Statistics">
      <FieldSection gap="0.75rem">
        <CellAt col={1} colSpan={2}>
          <FormField label="Template Items">
            <StatCell value={stats.templateItemsCount} ariaLabel="Linked template items total" />
          </FormField>
        </CellAt>
        <CellAt col={3} colSpan={2}>
          <FormField label="Work Order Items">
            <StatCell value={stats.workOrderItemsCount} ariaLabel="Linked work order items total" />
          </FormField>
        </CellAt>
        <CellAt col={5} colSpan={2}>
          <FormField label="Inventory">
            <StatCell value={stats.inventoryCount} ariaLabel="Linked inventory total" />
          </FormField>
        </CellAt>
        <CellAt col={7} colSpan={2}>
          <FormField label="Adjustments">
            <StatCell value={stats.adjustmentsCount} ariaLabel="Linked adjustments total" />
          </FormField>
        </CellAt>
      </FieldSection>
    </RecordItemSection>
  )
}
