"use client"

import { useUnsavedChangesGuard } from "@/features/dashboard/shared/navigation/use-unsaved-changes-guard"

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
