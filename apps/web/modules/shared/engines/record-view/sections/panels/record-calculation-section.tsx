"use client"

import type { ReactNode } from "react"
import {
  resolveRecordSectionCapabilities,
  type RecordSectionCapabilities,
} from "../structure/record-section-capabilities"
import { RecordItemSection } from "./record-item-section"
import { RecordSectionGrid, RecordSectionGridRow } from "../rows/record-section-grid"
import type { RecordSectionMetricValue } from "../metrics/record-section-metric"
import type { RecordSectionSubHeaderProps } from "../structure/record-section-sub-header"
import { RECORD_SECTION_BORDER_CLASS_NAME } from "../structure/record-section-tokens"
import type { RecordGridColumnSpec } from "../rows/record-row-layout"

export function RecordCalculationSection<TItem>({
  title,
  items,
  metrics,
  loading,
  columns,
  renderItem,
  loadingState,
  emptyState,
  subHeader,
  capabilities,
}: {
  title: string
  items: TItem[]
  metrics?: ReactNode | RecordSectionMetricValue[]
  loading: boolean
  columns: RecordGridColumnSpec[]
  renderItem: (item: TItem, index: number) => ReactNode
  loadingState?: ReactNode
  emptyState?: ReactNode
  subHeader?: Omit<RecordSectionSubHeaderProps, "sectionType" | "capabilities">
  capabilities?: RecordSectionCapabilities
}) {
  const resolvedCapabilities = resolveRecordSectionCapabilities("calculation", capabilities)

  return (
    <RecordItemSection
      title={title}
      metrics={metrics}
      subHeader={subHeader}
      bodyClassName="space-y-0"
      loading={loading}
      loadingState={loadingState ?? (
        <div className={`${RECORD_SECTION_BORDER_CLASS_NAME} border px-4 py-8 text-center text-[var(--foreground)]/70`}>
          Loading calculations...
        </div>
      )}
      isEmpty={false}
      capabilities={{
        ...resolvedCapabilities,
        supportsEmptyState: false,
      }}
    >
      <RecordSectionGrid
        columns={columns}
        isEmpty={items.length === 0}
        emptyState={emptyState ?? "No calculations available."}
      >
        {items.map((item, index) => (
          <RecordSectionGridRow key={index} columns={columns}>
            {renderItem(item, index)}
          </RecordSectionGridRow>
        ))}
      </RecordSectionGrid>
    </RecordItemSection>
  )
}
