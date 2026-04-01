"use client"

import {
  formatRecordCalculationValue,
  RecordCalculationRowBuilder,
  RecordCalculationSection,
} from "@/modules/shared/engines/record-view"
import { WORK_ORDER_CALCULATION_COLUMNS } from "./work-order-line-item-grid"
import { buildCalculationSectionMetrics } from "./work-order-section-metrics"
import { type DisplayCalculationRow } from "@/modules/shared/ui/record-items/calculation-rows-table"
export function WorkOrderCalculationsSection({
  title,
  items,
  loading,
}: {
  title: string
  items: DisplayCalculationRow[]
  loading: boolean
}) {
  const metrics = buildCalculationSectionMetrics(items)

  return (
    <RecordCalculationSection
      title={title}
      items={items}
      loading={loading}
      columns={WORK_ORDER_CALCULATION_COLUMNS}
      metrics={metrics.length > 0 ? metrics : undefined}
      renderItem={(item, index) => (
        <RecordCalculationRowBuilder
          label={item.label}
          value={formatRecordCalculationValue(item)}
          showCellLabels={index === 0}
        />
      )}
    />
  )
}
