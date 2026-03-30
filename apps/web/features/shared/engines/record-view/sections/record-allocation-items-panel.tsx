"use client"

import type { ReactNode } from "react"
import {
  joinRecordSectionClasses,
  RECORD_SECTION_BORDER_CLASS_NAME,
  RECORD_SECTION_ITEM_SURFACE_CLASS_NAME,
} from "./record-section-tokens"

export function RecordAllocationItemRow({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className={joinRecordSectionClasses(
        "w-full bg-orange-500/[0.08]",
        className,
      )}
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
  return (
    <div
      className={joinRecordSectionClasses(
        "overflow-hidden rounded-b-2xl",
        RECORD_SECTION_ITEM_SURFACE_CLASS_NAME,
        className,
      )}
    >
      {children ? (
        <div className="overflow-x-auto overscroll-x-contain">
          <div className={joinRecordSectionClasses("w-full overflow-hidden", RECORD_SECTION_BORDER_CLASS_NAME)}>
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
