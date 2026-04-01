"use client"

import {
  formatRecordCalculationValue,
  RecordCalculationRowBuilder,
  RecordCalculationSection,
} from "@/modules/shared/engines/record-view"
import { TEMPLATE_CALCULATION_COLUMNS } from "./template-line-item-grid"
import { buildTemplateCalculationSectionMetrics } from "./template-section-metrics"
import { type DisplayCalculationRow } from "@/modules/shared/engines/record-view/line-items/calculation-rows-table"
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
          value={formatRecordCalculationValue(item)}
          showCellLabels={index === 0}
        />
      )}
    />
  )
}
