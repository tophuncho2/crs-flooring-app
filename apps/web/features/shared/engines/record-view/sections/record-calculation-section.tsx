"use client"

import type { ReactNode } from "react"
import {
  resolveRecordSectionCapabilities,
  type RecordSectionCapabilities,
} from "./record-section-capabilities"
import { RecordItemSection } from "./record-item-section"
import type { RecordSectionMetricValue } from "./record-section-metric"
import { RecordSectionItem } from "./record-section-item"
import type { RecordSectionSubHeaderProps } from "./record-section-sub-header"
import { RECORD_SECTION_BORDER_CLASS_NAME } from "./record-section-tokens"

export function RecordCalculationSection<TItem>({
  title,
  items,
  metrics,
  loading,
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
  renderItem: (item: TItem) => ReactNode
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
      capabilities={resolvedCapabilities}
      loading={loading}
      loadingState={loadingState ?? (
        <div className={`${RECORD_SECTION_BORDER_CLASS_NAME} border px-4 py-8 text-center text-[var(--foreground)]/70`}>
          Loading calculations...
        </div>
      )}
      isEmpty={items.length === 0}
      emptyState={emptyState ?? (
        <div className={`${RECORD_SECTION_BORDER_CLASS_NAME} border px-4 py-8 text-center text-[var(--foreground)]/70`}>
          No calculations available.
        </div>
      )}
    >
      {items.map((item, index) => (
        <RecordSectionItem key={index}>
          {renderItem(item)}
        </RecordSectionItem>
      ))}
    </RecordItemSection>
  )
}
