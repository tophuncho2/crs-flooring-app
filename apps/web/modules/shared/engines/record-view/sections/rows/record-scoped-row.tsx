"use client"

import type { ReactNode } from "react"
import { RecordRowLayout, type RecordGridLayout } from "./record-row-layout"
import {
  joinRecordSectionClasses,
  RECORD_SECTION_BORDER_CLASS_NAME,
} from "../structure/record-section-tokens"

export function RecordScopedRow({
  layout,
  children,
  rowTone = "allocation",
  className,
}: {
  layout: RecordGridLayout
  children: ReactNode
  rowTone?: "default" | "allocation" | "error"
  className?: string
}) {
  const rowToneClassName =
    rowTone === "allocation"
      ? "bg-orange-500/[0.08]"
      : rowTone === "error"
        ? "bg-rose-500/[0.04]"
        : "bg-[var(--panel-background)]"

  return (
    <div className={className}>
      <RecordRowLayout
        layout={layout}
        className={joinRecordSectionClasses(
          rowToneClassName,
          "[&>*+*]:border-l",
          RECORD_SECTION_BORDER_CLASS_NAME,
        )}
      >
        {children}
      </RecordRowLayout>
    </div>
  )
}
