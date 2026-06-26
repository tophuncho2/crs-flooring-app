"use client"

import type { ReactNode } from "react"

export type ListPageFeedbackProps = {
  /** Success / info banner text (emerald). */
  message?: ReactNode
  /** Error banner text (rose). */
  pageError?: ReactNode
}

/**
 * The shared success / error banner pair for a list page — emerald for
 * `message`, rose for `pageError`, stacked above the table. Renders nothing
 * when both are empty. Caged here so every list client stops re-inlining the
 * identical block beneath its `ListActionBar`.
 */
export function ListPageFeedback({ message, pageError }: ListPageFeedbackProps) {
  if (!message && !pageError) return null
  return (
    <div className="space-y-2 pb-2">
      {message ? (
        <div className="rounded-md border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-800">
          {message}
        </div>
      ) : null}
      {pageError ? (
        <div className="rounded-md border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-800">
          {pageError}
        </div>
      ) : null}
    </div>
  )
}
