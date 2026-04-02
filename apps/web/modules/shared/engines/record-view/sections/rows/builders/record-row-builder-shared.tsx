"use client"

import type { ReactNode } from "react"
import { RecordFieldErrorText } from "../../../feedback"

export type RecordRowBuilderOption = {
  value: string
  label: string
}

export function FieldStack({
  children,
  error,
}: {
  children: ReactNode
  error?: string
}) {
  return (
    <div className="space-y-1">
      {children}
      {error ? <RecordFieldErrorText>{error}</RecordFieldErrorText> : null}
    </div>
  )
}

export function buildGridCellProps(columnKey: string, showCellLabels: boolean) {
  return {
    columnKey,
    chrome: "grid" as const,
    showLabel: showCellLabels,
  }
}
