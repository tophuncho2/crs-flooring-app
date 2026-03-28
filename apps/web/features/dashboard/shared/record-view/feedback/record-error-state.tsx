"use client"

import { CenteredErrorState, CenteredLoadingState } from "@/features/dashboard/shared/feedback/feedback-states"

export function RecordErrorState({
  title = "Error",
  message,
  onDismiss,
}: {
  title?: string
  message: string
  onDismiss: () => void
}) {
  return <CenteredErrorState title={title} message={message} onDismiss={onDismiss} />
}

export function RecordLoadingState({ label }: { label: string }) {
  return <CenteredLoadingState label={label} />
}
