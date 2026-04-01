"use client"

import { useUnsavedChangesGuard } from "@/modules/shared/engines/common/navigation/use-unsaved-changes-guard"

export function useRecordCloseGuard({
  isDirty,
  message,
}: {
  isDirty: boolean
  message: string
}) {
  return useUnsavedChangesGuard({
    isDirty,
    message,
  })
}
