"use client"

import type { ReactNode } from "react"
import { RecordFormNotices } from "./record-form-notices"

export function RecordPageActionNotices({
  message,
  error,
  children,
}: {
  message?: string
  error?: string
  children?: ReactNode
}) {
  if (!message && !error && !children) {
    return null
  }

  return (
    <div className="space-y-4">
      {message || error ? <RecordFormNotices message={message ?? ""} error={error ?? ""} loadingMessage="" /> : null}
      {children}
    </div>
  )
}
