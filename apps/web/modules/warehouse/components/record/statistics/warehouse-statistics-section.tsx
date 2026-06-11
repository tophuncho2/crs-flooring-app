"use client"

import type { WarehouseStats } from "@builders/domain"
import { CellAt, FieldSection, FormField, RecordItemSection, StatCell } from "@/engines/record-view"

export type WarehouseStatisticsSectionProps = {
  stats: WarehouseStats
}

/**
 * Read-only totals for the warehouse: counts of linked templates, work orders,
 * and imports. Renders on the record-view invisible grid via `StatCell`. No
 * controller / no mutations — the panel mounts it as a `type: "item"` section.
 */
export function WarehouseStatisticsSection({ stats }: WarehouseStatisticsSectionProps) {
  return (
    <RecordItemSection title="Statistics">
      <FieldSection gap="0.75rem">
        <CellAt col={1} colSpan={3}>
          <FormField label="Templates">
            <StatCell value={stats.templatesCount} ariaLabel="Linked templates total" />
          </FormField>
        </CellAt>
        <CellAt col={4} colSpan={3}>
          <FormField label="Work Orders">
            <StatCell value={stats.workOrdersCount} ariaLabel="Linked work orders total" />
          </FormField>
        </CellAt>
        <CellAt col={7} colSpan={2}>
          <FormField label="Imports">
            <StatCell value={stats.importsCount} ariaLabel="Linked imports total" />
          </FormField>
        </CellAt>
      </FieldSection>
    </RecordItemSection>
  )
}
