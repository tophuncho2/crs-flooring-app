"use client"

import {
  RecordCalculationRowBuilder,
  RecordCalculationSection,
} from "@/features/shared/engines/record-view"
import { WORK_ORDER_CALCULATION_COLUMNS } from "./work-order-line-item-grid"
import { buildCalculationSectionMetrics } from "./work-order-section-metrics"
import { type DisplayCalculationRow } from "@/features/flooring/shared/line-items/calculation-rows-table"
import { formatCurrencyValue } from "@/features/flooring/shared/line-items/line-totals"

function formatCalculationValue(row: DisplayCalculationRow) {
  if (row.format === "percentage") {
    return `${(row.value * 100).toFixed(2)}%`
  }

  return formatCurrencyValue(row.value)
}

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
          value={formatCalculationValue(item)}
          showCellLabels={index === 0}
        />
      )}
    />
  )
}
