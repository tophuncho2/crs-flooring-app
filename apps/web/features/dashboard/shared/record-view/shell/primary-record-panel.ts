"use client"

import { useUrlRecordPanel, useGuardedUrlRecordPanel } from "@/features/dashboard/shared/navigation/url-record-panel"
export { PRIMARY_RECORD_PANEL_WIDTH_CLASS } from "@/features/dashboard/shared/record-view/shell/record-panel-width"

const PRIMARY_RECORD_PANEL_KEYS = {
  template: "template",
  workOrder: "workOrder",
} as const

export type PrimaryRecordPanelKey = keyof typeof PRIMARY_RECORD_PANEL_KEYS

export function usePrimaryRecordPanel(key: PrimaryRecordPanelKey) {
  return useUrlRecordPanel(PRIMARY_RECORD_PANEL_KEYS[key])
}

export function useGuardedPrimaryRecordPanel(
  key: PrimaryRecordPanelKey,
  options: {
    isDirty: boolean
    message?: string
  },
) {
  return useGuardedUrlRecordPanel(PRIMARY_RECORD_PANEL_KEYS[key], options)
}
