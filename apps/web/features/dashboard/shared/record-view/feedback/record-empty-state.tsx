"use client"

import { CenteredErrorState } from "@/features/dashboard/shared/feedback/feedback-states"

export function RecordEmptyState({
  title = "No record",
  message,
  onDismiss,
}: {
  title?: string
  message: string
  onDismiss: () => void
}) {
  return <CenteredErrorState title={title} message={message} onDismiss={onDismiss} />
}
