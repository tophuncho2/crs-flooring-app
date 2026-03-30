"use client"

import type { KeyboardEvent, ReactNode } from "react"
import { useRecordScrollSync } from "./record-scroll-sync"
import {
  joinRecordSectionClasses,
  RECORD_SECTION_BORDER_CLASS_NAME,
  RECORD_SECTION_ITEM_SURFACE_CLASS_NAME,
} from "./record-section-tokens"

export function RecordAllocationItemRow({
  children,
  className,
  onOpen,
  openAriaLabel,
}: {
  children: ReactNode
  className?: string
  onOpen?: () => void
  openAriaLabel?: string
}) {
  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (!onOpen) {
      return
    }

    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault()
      onOpen()
    }
  }

  return (
    <div
      className={joinRecordSectionClasses(
        "w-full bg-orange-500/[0.08]",
        onOpen ? "cursor-pointer transition hover:bg-orange-500/[0.14] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/20" : undefined,
        className,
      )}
      role={onOpen ? "button" : undefined}
      tabIndex={onOpen ? 0 : undefined}
      aria-label={onOpen ? openAriaLabel : undefined}
      onClick={onOpen}
      onKeyDown={handleKeyDown}
    >
      {children}
    </div>
  )
}

export function RecordAllocationItemsPanel({
  children,
  emptyState,
  footer,
  className,
}: {
  children?: ReactNode
  emptyState?: ReactNode
  footer?: ReactNode
  className?: string
}) {
  const { scrollRef, onScroll } = useRecordScrollSync("allocation")

  return (
    <div
      className={joinRecordSectionClasses(
        "overflow-hidden rounded-b-2xl",
        RECORD_SECTION_ITEM_SURFACE_CLASS_NAME,
        className,
      )}
    >
      {children ? (
        <div ref={scrollRef} onScroll={onScroll} className="overflow-x-auto overscroll-x-contain">
          <div className={joinRecordSectionClasses("w-max min-w-full", RECORD_SECTION_BORDER_CLASS_NAME)}>
            {children}
          </div>
        </div>
      ) : emptyState ? (
        <div
          className={joinRecordSectionClasses(
            "border border-dashed px-3 py-3 text-sm text-[var(--foreground)]/60",
            RECORD_SECTION_BORDER_CLASS_NAME,
          )}
        >
          {emptyState}
        </div>
      ) : null}
      {footer ? (
        <div
          className={joinRecordSectionClasses(
            "flex justify-end border-t px-3 pb-3 pt-3",
            RECORD_SECTION_BORDER_CLASS_NAME,
          )}
        >
          {footer}
        </div>
      ) : null}
    </div>
  )
}
