"use client"

import {
  RecordCalculationSection,
  RecordItemCell,
  RecordRowLayout,
  TextCell,
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
      metrics={metrics.length > 0 ? metrics : undefined}
      renderItem={(item) => (
        <RecordRowLayout key={item.key} columns={TEMPLATE_CALCULATION_COLUMNS}>
              <RecordItemCell label="Calculation" columnKey="calculation">
                <TextCell>{item.label}</TextCell>
              </RecordItemCell>
              <RecordItemCell label="Value" columnKey="value">
                <TextCell align="right" className="font-medium">
                  {formatCalculationValue(item)}
                </TextCell>
              </RecordItemCell>
        </RecordRowLayout>
      )}
    />
  )
}
