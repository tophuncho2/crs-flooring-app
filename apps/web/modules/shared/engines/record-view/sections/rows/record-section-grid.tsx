"use client"

import type { ReactNode } from "react"
import { RecordRowLayout, type RecordGridColumnSpec } from "./record-row-layout"
import { useRecordScrollSync } from "../structure/record-scroll-sync"
import {
  joinRecordSectionClasses,
  RECORD_SECTION_BORDER_CLASS_NAME,
} from "../structure/record-section-tokens"

export function RecordSectionGrid({
  columns,
  children,
  isEmpty = false,
  emptyState,
  footer,
  className,
  headerClassName,
}: {
  columns: RecordGridColumnSpec[]
  children?: ReactNode
  isEmpty?: boolean
  emptyState?: ReactNode
  footer?: ReactNode
  className?: string
  headerClassName?: string
}) {
  const { scrollRef, onScroll } = useRecordScrollSync()

  return (
    <div
      className={joinRecordSectionClasses(
        "overflow-hidden rounded-xl",
        "border bg-[var(--panel-background)] shadow-[0_12px_28px_rgba(0,0,0,0.1)]",
        RECORD_SECTION_BORDER_CLASS_NAME,
        className,
      )}
    >
      {isEmpty ? (
        <div className={joinRecordSectionClasses("px-4 py-8 text-center text-[var(--foreground)]/65")}>
          {emptyState}
        </div>
      ) : (
        <div
          ref={scrollRef}
          onScroll={onScroll}
          className={joinRecordSectionClasses("overflow-x-auto overscroll-x-contain", headerClassName)}
        >
          <div className="w-max min-w-full">
            <div className={joinRecordSectionClasses("[&>*+*]:border-t", RECORD_SECTION_BORDER_CLASS_NAME)}>
              {children}
            </div>
          </div>
        </div>
      )}
      {footer ? (
        <div
          className={joinRecordSectionClasses(
            "flex justify-end border-t px-3 py-3",
            RECORD_SECTION_BORDER_CLASS_NAME,
          )}
        >
          {footer}
        </div>
      ) : null}
    </div>
  )
}

export function RecordSectionGridRow({
  columns,
  children,
  rowTone = "default",
  className,
}: {
  columns: RecordGridColumnSpec[]
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
        columns={columns}
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
