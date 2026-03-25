"use client"

import { useCallback } from "react"
import { useUrlRecordPanel } from "./use-url-record-panel"
import { useUnsavedChangesGuard } from "./use-unsaved-changes-guard"

export function useGuardedUrlRecordPanel(
  paramKey: string,
  options: {
    isDirty: boolean
    message?: string
  },
) {
  const panel = useUrlRecordPanel(paramKey)
  const guard = useUnsavedChangesGuard(options)

  const openRecord = useCallback(
    (recordId: string) => {
      if (panel.activeRecordId === recordId) {
        return true
      }

      return guard.confirmNavigation(() => panel.openRecord(recordId))
    },
    [guard, panel],
  )

  const closeRecord = useCallback(() => guard.confirmNavigation(() => panel.closeRecord()), [guard, panel])

  return {
    ...panel,
    openRecord,
    closeRecord,
    confirmNavigation: guard.confirmNavigation,
    isDirty: guard.isDirty,
  }
}
