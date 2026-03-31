"use client"

import type { ReactNode } from "react"
import type { RecordDetailClientScaffoldContext } from "../client/record-detail-client-scaffold"
import type { RecordNotices } from "../client/use-record-notices"
import type { RecordSectionCapabilities, RecordSectionType } from "../sections/record-section-capabilities"
import type { RecordSectionMetricValue } from "../sections/record-section-metric"
import type { RecordSectionSubHeaderProps } from "../sections/record-section-sub-header"

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
