"use client"

import { CenteredErrorState } from "@/features/flooring/shared/feedback-states"

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <CenteredErrorState
      title="Error"
      message={error.message || "Something went wrong while loading this page."}
      dismissLabel="Try again"
      onDismiss={reset}
      className="max-w-2xl"
    />
  )
}
