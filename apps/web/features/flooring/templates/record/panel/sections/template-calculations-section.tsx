"use client"

import {
  RecordCalculationRowBuilder,
  RecordCalculationSection,
} from "@/features/shared/engines/record-view"
import { TEMPLATE_CALCULATION_COLUMNS } from "./template-line-item-grid"
import { buildTemplateCalculationSectionMetrics } from "./template-section-metrics"
import { type DisplayCalculationRow } from "@/features/flooring/shared/line-items/calculation-rows-table"
import { formatCurrencyValue } from "@/features/flooring/shared/line-items/line-totals"

function formatCalculationValue(row: DisplayCalculationRow) {
  if (row.format === "percentage") {
    return `${(row.value * 100).toFixed(2)}%`
  }

  return formatCurrencyValue(row.value)
}

export function TemplateCalculationsSection({
  title,
  items,
  loading,
}: {
  title: string
  items: DisplayCalculationRow[]
  loading: boolean
}) {
  const metrics = buildTemplateCalculationSectionMetrics(items)

  return (
    <RecordCalculationSection
      title={title}
      items={items}
      loading={loading}
      columns={TEMPLATE_CALCULATION_COLUMNS}
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
