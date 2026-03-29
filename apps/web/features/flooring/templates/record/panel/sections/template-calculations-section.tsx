"use client"

import {
  RecordItemCell,
  RecordRowLayout,
  RecordSectionMetric,
  RecordSectionShell,
  RECORD_SECTION_BORDER_CLASS_NAME,
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
    <RecordSectionShell
      title={title}
      bodyClassName="space-y-4"
      metrics={
        metrics.length > 0
          ? metrics.map((metric) => <RecordSectionMetric key={metric.label} label={metric.label} value={metric.value} />)
          : undefined
      }
    >
      {loading ? (
        <div className={`${RECORD_SECTION_BORDER_CLASS_NAME} border px-4 py-8 text-center text-[var(--foreground)]/70`}>
          Loading calculations...
        </div>
      ) : null}
      {!loading && items.length === 0 ? (
        <div className={`${RECORD_SECTION_BORDER_CLASS_NAME} border px-4 py-8 text-center text-[var(--foreground)]/70`}>
          No calculations available.
        </div>
      ) : null}
      {!loading
        ? items.map((item) => (
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
          ))
        : null}
    </RecordSectionShell>
  )
}
