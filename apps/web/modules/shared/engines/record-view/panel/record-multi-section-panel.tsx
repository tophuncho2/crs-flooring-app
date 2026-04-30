"use client"

import type { RecordPageSummary } from "../client/controllers/use-record-page-controller"
import type { RecordPanelRendererProps } from "./record-panel-renderer"
import { RecordPanelRenderer } from "./record-panel-renderer"

export type {
  RecordPanelContext as RecordMultiSectionPanelContext,
  RecordPanelFooterConfig,
  RecordPanelSectionConfig,
  RecordPanelSectionControllerState,
} from "./record-panel-config"

export function RecordMultiSectionPanel({
  ...props
}: RecordPanelRendererProps & {
  summary?: RecordPageSummary
}) {
  return <RecordPanelRenderer {...props} />
}
