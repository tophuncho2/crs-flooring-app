"use client"

import type { JobTypeStats } from "@builders/domain"
import { CellAt, FieldSection, FormField, RecordItemSection, StatCell } from "@/engines/record-view"

export type JobTypeStatisticsSectionProps = {
  stats: JobTypeStats
}

/**
 * Read-only totals for the job type: counts of linked templates and work orders.
 * Renders on the record-view invisible grid via `StatCell`. No controller / no
 * mutations — the panel mounts it as a `type: "item"` section. Mirrors the
 * warehouse statistics section.
 */
export function JobTypeStatisticsSection({ stats }: JobTypeStatisticsSectionProps) {
  return (
    <RecordItemSection title="Statistics">
      <FieldSection gap="0.75rem">
        <CellAt col={1} colSpan={4}>
          <FormField label="Templates">
            <StatCell value={stats.templatesCount} ariaLabel="Linked templates total" />
          </FormField>
        </CellAt>
        <CellAt col={5} colSpan={4}>
          <FormField label="Work Orders">
            <StatCell value={stats.workOrdersCount} ariaLabel="Linked work orders total" />
          </FormField>
        </CellAt>
      </FieldSection>
    </RecordItemSection>
  )
}
