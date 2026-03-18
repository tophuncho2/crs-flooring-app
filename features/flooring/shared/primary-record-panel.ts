"use client"

import { useUrlRecordPanel } from "./use-url-record-panel"

export const PRIMARY_RECORD_PANEL_WIDTH_CLASS = "max-w-[92rem]"

const PRIMARY_RECORD_PANEL_KEYS = {
  template: "template",
  workOrder: "workOrder",
} as const

export type PrimaryRecordPanelKey = keyof typeof PRIMARY_RECORD_PANEL_KEYS

export function usePrimaryRecordPanel(key: PrimaryRecordPanelKey) {
  return useUrlRecordPanel(PRIMARY_RECORD_PANEL_KEYS[key])
}
