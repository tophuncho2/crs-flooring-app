"use client"

import type { ReactNode } from "react"
import {
  joinRecordSectionClasses,
  RECORD_SECTION_BORDER_CLASS_NAME,
  RECORD_SECTION_HEADER_HOVER_CLASS_NAME,
  RECORD_SECTION_HEADER_SURFACE_CLASS_NAME,
} from "@/features/dashboard/shared/record-view/sections/record-section-tokens"

export function RecordSectionHeader({
  title,
  isOpen,
  onToggle,
  metrics,
  actions,
  className,
}: {
  title: string
  isOpen: boolean
  onToggle: () => void
  metrics?: ReactNode
  actions?: ReactNode
  className?: string
}) {
  return (
    <div
      className={joinRecordSectionClasses(
        "relative",
        isOpen ? "border-b" : undefined,
        RECORD_SECTION_BORDER_CLASS_NAME,
        className,
      )}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        aria-label={isOpen ? `Collapse ${title}` : `Expand ${title}`}
        className={joinRecordSectionClasses(
          "group absolute inset-0 z-0 w-full text-left transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40",
          RECORD_SECTION_HEADER_SURFACE_CLASS_NAME,
          RECORD_SECTION_HEADER_HOVER_CLASS_NAME,
        )}
      />
      <div className="pointer-events-none relative z-[1] flex items-center gap-4 px-5 py-5">
        <div className="flex min-w-0 flex-1 items-center gap-4">
          <div className="min-w-0">
            <div className="inline-flex items-center border border-[var(--panel-border)] bg-[var(--panel-background)] px-3 py-1.5 text-base font-semibold text-[var(--foreground)] shadow-[0_4px_12px_rgba(0,0,0,0.08)]">
              {title}
            </div>
          </div>
        </div>
        {(metrics || actions) ? (
          <div className="ml-auto flex min-w-0 items-center gap-3">
            {metrics ? <div className="flex flex-wrap items-center justify-end gap-2">{metrics}</div> : null}
            {actions ? <div className="pointer-events-auto relative z-[2] flex items-center">{actions}</div> : null}
          </div>
        ) : null}
      </div>
    </div>
  )
}
