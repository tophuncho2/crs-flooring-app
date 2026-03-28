import type { ReactNode } from "react"
import {
  joinRecordSectionClasses,
  RECORD_SECTION_BORDER_CLASS_NAME,
  RECORD_SECTION_BODY_SURFACE_CLASS_NAME,
  RECORD_SECTION_ITEM_SURFACE_CLASS_NAME,
} from "@/features/dashboard/shared/record-view/sections/record-section-tokens"

export function RecordSectionSubtable({
  title,
  summary,
  actions,
  children,
  emptyState,
  isEmpty = false,
  className,
}: {
  title?: ReactNode
  summary?: ReactNode
  actions?: ReactNode
  children?: ReactNode
  emptyState?: ReactNode
  isEmpty?: boolean
  className?: string
}) {
  return (
    <div
      className={joinRecordSectionClasses(
        "overflow-hidden border-t",
        RECORD_SECTION_BORDER_CLASS_NAME,
        RECORD_SECTION_ITEM_SURFACE_CLASS_NAME,
        className,
      )}
    >
      {(title || summary || actions) ? (
        <div
          className={joinRecordSectionClasses(
            "flex flex-col gap-3 border-b px-4 py-3 lg:flex-row lg:items-center lg:justify-between",
            RECORD_SECTION_BORDER_CLASS_NAME,
            RECORD_SECTION_BODY_SURFACE_CLASS_NAME,
          )}
        >
          <div className="min-w-0 space-y-1">
            {title ? <div className="text-sm font-semibold text-[var(--foreground)]">{title}</div> : null}
            {summary ? <div className="text-sm text-[var(--foreground)]/65">{summary}</div> : null}
          </div>
          {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
        </div>
      ) : null}
      <div className="px-4 py-4">{isEmpty ? emptyState : children}</div>
    </div>
  )
}
