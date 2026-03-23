"use client"

import { useUrlRecordPanel } from "@/features/flooring/shared/use-url-record-panel"
import { useGuardedUrlRecordPanel } from "@/features/flooring/shared/use-guarded-url-record-panel"

export const PRIMARY_RECORD_PANEL_WIDTH_CLASS = "max-w-none"

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
