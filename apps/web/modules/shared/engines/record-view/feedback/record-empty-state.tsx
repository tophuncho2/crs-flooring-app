"use client"

import { CenteredErrorState } from "@/modules/shared/engines/common/feedback/feedback-states"

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
