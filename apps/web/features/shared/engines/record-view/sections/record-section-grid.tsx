"use client"

import type { KeyboardEvent, ReactNode } from "react"
import { getRecordRowColumnStyle, RecordRowLayout, type RecordGridColumnSpec } from "./record-row-layout"
import { useRecordScrollSync } from "./record-scroll-sync"
import {
  joinRecordSectionClasses,
  RECORD_SECTION_BORDER_CLASS_NAME,
} from "./record-section-tokens"

function resolveAlignClassName(align: RecordGridColumnSpec["align"]) {
  if (align === "center") {
    return "text-center"
  }

  if (align === "end") {
    return "text-right"
  }

  return "text-left"
}

export function RecordSectionGrid({
  columns,
  group = "parent",
  children,
  isEmpty = false,
  emptyState,
  footer,
  surface = "outer",
  className,
  headerClassName,
}: {
  columns: RecordGridColumnSpec[]
  group?: "parent" | "allocation"
  children?: ReactNode
  isEmpty?: boolean
  emptyState?: ReactNode
  footer?: ReactNode
  surface?: "outer" | "nested"
  className?: string
  headerClassName?: string
}) {
  const roundedClassName = surface === "outer" ? "rounded-xl" : "rounded-none"
  const surfaceClassName =
    surface === "outer"
      ? "border bg-[var(--panel-background)] shadow-[0_12px_28px_rgba(0,0,0,0.1)]"
      : "border-0 bg-orange-500/[0.06]"

  return (
    <div
      className={joinRecordSectionClasses(
        "overflow-hidden",
        roundedClassName,
        surfaceClassName,
        surface === "outer" ? RECORD_SECTION_BORDER_CLASS_NAME : undefined,
        className,
      )}
    >
      <RecordSectionGridHeader columns={columns} group={group} className={headerClassName} />
      {isEmpty ? (
        <div className={joinRecordSectionClasses("px-4 py-8 text-center text-[var(--foreground)]/65")}>
          {emptyState}
        </div>
      ) : (
        <div className={joinRecordSectionClasses("[&>*+*]:border-t", RECORD_SECTION_BORDER_CLASS_NAME)}>
          {children}
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

export function RecordSectionGridHeader({
  columns,
  group,
  className,
}: {
  columns: RecordGridColumnSpec[]
  group: "parent" | "allocation"
  className?: string
}) {
  const { scrollRef, onScroll } = useRecordScrollSync(group)

  return (
    <div className={joinRecordSectionClasses("border-b bg-[var(--panel-hover)]", RECORD_SECTION_BORDER_CLASS_NAME, className)}>
      <div ref={scrollRef} onScroll={onScroll} className="overflow-x-auto overscroll-x-contain">
        <RecordRowLayout
          columns={columns}
          className={joinRecordSectionClasses(
            "bg-[var(--panel-hover)]",
            "[&>*+*]:border-l",
            RECORD_SECTION_BORDER_CLASS_NAME,
          )}
        >
          {columns.map((column) => (
            <div
              key={column.key}
              className={joinRecordSectionClasses(
                "shrink-0 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--foreground)]/70",
                resolveAlignClassName(column.align),
              )}
              style={getRecordRowColumnStyle(column)}
            >
              {column.label}
            </div>
          ))}
        </RecordRowLayout>
      </div>
    </div>
  )
}

export function RecordSectionGridRow({
  columns,
  group = "parent",
  children,
  nestedContent,
  onOpen,
  openAriaLabel,
  rowTone = "default",
  className,
}: {
  columns: RecordGridColumnSpec[]
  group?: "parent" | "allocation"
  children: ReactNode
  nestedContent?: ReactNode
  onOpen?: () => void
  openAriaLabel?: string
  rowTone?: "default" | "allocation" | "error"
  className?: string
}) {
  const { scrollRef, onScroll } = useRecordScrollSync(group)

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (!onOpen) {
      return
    }

    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault()
      onOpen()
    }
  }

  const rowToneClassName =
    rowTone === "allocation"
      ? "bg-orange-500/[0.08]"
      : rowTone === "error"
        ? "bg-rose-500/[0.04]"
        : "bg-[var(--panel-background)]"

  return (
    <div className={className}>
      <div
        role={onOpen ? "button" : undefined}
        tabIndex={onOpen ? 0 : undefined}
        aria-label={onOpen ? openAriaLabel : undefined}
        onClick={onOpen}
        onKeyDown={handleKeyDown}
        className={joinRecordSectionClasses(
          onOpen ? "cursor-pointer transition hover:bg-[var(--panel-hover)]/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/20" : undefined,
        )}
      >
        <div ref={scrollRef} onScroll={onScroll} className="overflow-x-auto overscroll-x-contain">
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
      </div>
      {nestedContent ? (
        <div className={joinRecordSectionClasses("border-t", RECORD_SECTION_BORDER_CLASS_NAME)}>
          {nestedContent}
        </div>
      ) : null}
    </div>
  )
}
