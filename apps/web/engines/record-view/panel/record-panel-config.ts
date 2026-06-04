"use client"

import type { ReactNode } from "react"
import type { RecordDetailClientScaffoldContext } from "@/scaffolds/record-detail-client-scaffold"
import type { RecordNotices } from "@/hooks/record/use-record-notices"
import type { RecordSectionCapabilities, RecordSectionType } from "@/components/sections/structure/record-section-capabilities"
import type { RecordSectionMetricValue } from "@/components/sections/metrics/record-section-metric"
import type { RecordSectionSubHeaderProps } from "@/components/sections/structure/record-section-sub-header"

export type RecordPanelSectionControllerState = {
  isDirty?: boolean
  isSaving?: boolean
  hasConflict?: boolean
}

export type RecordPanelContext = {
  page: RecordDetailClientScaffoldContext
  notices?: RecordNotices
}

export type RecordPanelSectionConfig = {
  key: string
  type: RecordSectionType
  order: number
  slot?: "primary" | "section"
  dirtyLabel?: string
  controller?: RecordPanelSectionControllerState
  capabilities?: RecordSectionCapabilities
  metrics?: ReactNode | RecordSectionMetricValue[]
  actions?: RecordSectionSubHeaderProps["actions"]
  visibleWhen?: (context: RecordPanelContext) => boolean
  render: (context: RecordPanelContext) => ReactNode
}

export type RecordPanelFooterConfig = {
  deleteLabel?: string
  deleteConfirmMessage?: string
  onDelete?: () => void | Promise<void>
  onClose?: () => void
}
