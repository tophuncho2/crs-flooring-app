"use client"

import type { ReactNode } from "react"
import {
  resolveRecordSectionCapabilities,
  type RecordSectionCapabilities,
} from "../structure/record-section-capabilities"
import { RecordSectionShell } from "../structure/record-section-shell"
import type { RecordSectionMetricValue } from "../metrics/record-section-metric"
import {
  RecordSectionSubHeader,
  type RecordSectionSubHeaderProps,
} from "../structure/record-section-sub-header"
import { RecordScrollSyncProvider } from "../structure/record-scroll-sync"
import { RECORD_SECTION_BORDER_CLASS_NAME } from "../structure/record-section-tokens"

export type RecordItemSectionProps = {
  title: string
  children?: ReactNode
  metrics?: ReactNode | RecordSectionMetricValue[]
  subHeader?: Omit<RecordSectionSubHeaderProps, "sectionType" | "capabilities">
  noticeMessage?: string
  noticeError?: string
  capabilities?: RecordSectionCapabilities
  bodyClassName?: string
  loading?: boolean
  loadingState?: ReactNode
  isEmpty?: boolean
  emptyState?: ReactNode
}

export function RecordItemSection({
  title,
  children,
  metrics,
  subHeader,
  noticeMessage,
  noticeError,
  capabilities,
  bodyClassName = "space-y-4",
  loading = false,
  loadingState,
  isEmpty = false,
  emptyState,
}: RecordItemSectionProps) {
  const resolvedCapabilities = resolveRecordSectionCapabilities("item", capabilities)

  const statusPanel = subHeader ? (
    <RecordSectionSubHeader
      sectionType="item"
      capabilities={resolvedCapabilities}
      {...subHeader}
    />
  ) : undefined

  const resolvedLoadingState = loadingState ?? (
    <div className={`${RECORD_SECTION_BORDER_CLASS_NAME} border px-4 py-8 text-center text-[var(--foreground)]/70`}>
      Loading rows...
    </div>
  )

  return (
    <RecordScrollSyncProvider>
      <RecordSectionShell
        title={title}
        bodyClassName={bodyClassName}
        statusPanel={statusPanel}
        noticeMessage={noticeMessage}
        noticeError={noticeError}
        metrics={resolvedCapabilities.supportsMetrics ? metrics : undefined}
        sectionType="item"
        capabilities={resolvedCapabilities}
      >
        {loading ? resolvedLoadingState : null}
        {!loading && resolvedCapabilities.supportsEmptyState && isEmpty ? emptyState ?? null : null}
        {!loading ? children : null}
      </RecordSectionShell>
    </RecordScrollSyncProvider>
  )
}
