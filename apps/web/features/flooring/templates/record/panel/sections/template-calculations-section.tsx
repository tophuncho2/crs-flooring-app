"use client"

import {
  RecordItemCell,
  RecordSectionMetric,
  RecordSectionShell,
  RECORD_SECTION_BORDER_CLASS_NAME,
} from "@/features/shared/engines/record-view"
import { TEMPLATE_CALCULATION_GRID_CLASS_NAME } from "./template-line-item-grid"
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
            <div key={item.key} className={TEMPLATE_CALCULATION_GRID_CLASS_NAME}>
              <RecordItemCell label="Calculation">{item.label}</RecordItemCell>
              <RecordItemCell label="Value">
                <div className="rounded border border-[var(--panel-border)] px-2 py-1 font-medium">
                  {formatCalculationValue(item)}
                </div>
              </RecordItemCell>
            </div>
          ))
        : null}
    </RecordSectionShell>
  )
}
