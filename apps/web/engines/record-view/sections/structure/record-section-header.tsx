"use client"

import type { ReactNode } from "react"
import { ChevronDown } from "lucide-react"
import type { RecordSectionError } from "@/types/record/section-error"
import {
  joinRecordSectionClasses,
  RECORD_SECTION_BORDER_CLASS_NAME,
  RECORD_SECTION_HEADER_ACCENT_SPINE_CLASS_NAME,
  RECORD_SECTION_HEADER_HOVER_CLASS_NAME,
  RECORD_SECTION_HEADER_SURFACE_CLASS_NAME,
} from "./record-section-tokens"
import { RecordSectionMetricsGroup } from "../metrics/record-section-metrics-group"
import { RecordSectionNoticeStrip } from "./record-section-notice-strip"

export function RecordSectionHeader({
  title,
  isOpen,
  onToggle,
  metrics,
  actions,
  noticeMessage,
  noticeError,
  noticeInfo,
  error,
  className,
}: {
  title: string
  isOpen: boolean
  onToggle: () => void
  metrics?: ReactNode
  actions?: ReactNode
  noticeMessage?: string
  noticeError?: string
  noticeInfo?: string
  error?: ReactNode | RecordSectionError | null
  className?: string
}) {
  return (
    <div
      className={joinRecordSectionClasses(
        "relative",
        RECORD_SECTION_HEADER_SURFACE_CLASS_NAME,
        isOpen ? "border-b" : undefined,
        RECORD_SECTION_BORDER_CLASS_NAME,
        className,
      )}
    >
      {/* Identity accent spine — square, flush against the section's left edge. */}
      <span
        aria-hidden="true"
        className={joinRecordSectionClasses(
          "pointer-events-none absolute inset-y-0 left-0 w-[3px]",
          RECORD_SECTION_HEADER_ACCENT_SPINE_CLASS_NAME,
        )}
      />
      <div className="flex items-center gap-3 px-5 py-3.5">
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={isOpen}
          aria-label={isOpen ? `Collapse ${title}` : `Expand ${title}`}
          className={joinRecordSectionClasses(
            "flex size-7 shrink-0 items-center justify-center rounded-md text-[var(--foreground)]/55 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40",
            RECORD_SECTION_HEADER_HOVER_CLASS_NAME,
          )}
        >
          <ChevronDown
            size={18}
            aria-hidden="true"
            className={joinRecordSectionClasses(
              "transition-transform duration-200",
              isOpen ? undefined : "-rotate-90",
            )}
          />
        </button>
        <h3 className="min-w-0 flex-1 truncate text-base font-semibold tracking-tight text-[var(--foreground)]">
          {title}
        </h3>
        {metrics || actions ? (
          <div className="ml-auto flex shrink-0 items-center gap-3">
            <RecordSectionMetricsGroup>{metrics}</RecordSectionMetricsGroup>
            {actions ? <div className="flex items-center">{actions}</div> : null}
          </div>
        ) : null}
      </div>
      <RecordSectionNoticeStrip
        message={noticeMessage}
        error={error}
        noticeError={noticeError}
        info={noticeInfo}
      />
    </div>
  )
}
