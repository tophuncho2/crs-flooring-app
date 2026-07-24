"use client"

import { type ReactNode, useEffect, useRef, useState } from "react"
import type { RecordSectionError } from "@/types/record/section-error"
import { TableBleed } from "./table-bleed"
import { RecordSectionHeader } from "./record-section-header"
import { RecordSectionMetric, type RecordSectionMetricValue } from "../metrics/record-section-metric"
import type { RecordSectionCapabilities, RecordSectionType } from "./record-section-capabilities"
import {
  joinRecordSectionClasses,
  RECORD_SECTION_BODY_SURFACE_CLASS_NAME,
  RECORD_SECTION_BORDER_CLASS_NAME,
  RECORD_SECTION_SHELL_CLASS_NAME,
  RECORD_SECTION_SHELL_FLUSH_CLASS_NAME,
} from "./record-section-tokens"

export function RecordSectionShell({
  title,
  children,
  metrics,
  actions,
  statusPanel,
  noticeMessage,
  noticeError,
  noticeInfo,
  error,
  defaultOpen = true,
  onOpenChange,
  bodyClassName,
  className,
  flush = false,
  sectionType,
  capabilities,
}: {
  title: string
  children: ReactNode
  metrics?: ReactNode | RecordSectionMetricValue[]
  actions?: ReactNode
  statusPanel?: ReactNode
  noticeMessage?: string
  noticeError?: string
  noticeInfo?: string
  error?: ReactNode | RecordSectionError | null
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
  bodyClassName?: string
  className?: string
  /** Table sections: square the shell + strip the body's horizontal padding so
   *  the table bleeds edge-to-edge (nav rail → viewport) like a list page. */
  flush?: boolean
  sectionType?: RecordSectionType
  capabilities?: RecordSectionCapabilities
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen)
  const hasReportedOpenState = useRef(false)
  const metricContent = Array.isArray(metrics)
    ? metrics.map((metric) => (
        <RecordSectionMetric
          key={metric.label}
          label={metric.label}
          value={metric.value}
          className={metric.className}
        />
      ))
    : metrics

  useEffect(() => {
    if (!onOpenChange) {
      return
    }

    if (!hasReportedOpenState.current) {
      hasReportedOpenState.current = true
      return
    }

    onOpenChange(isOpen)
  }, [isOpen, onOpenChange])

  return (
    <TableBleed variant="record">
      <section
        className={joinRecordSectionClasses(
          flush ? RECORD_SECTION_SHELL_FLUSH_CLASS_NAME : RECORD_SECTION_SHELL_CLASS_NAME,
          RECORD_SECTION_BORDER_CLASS_NAME,
          className,
        )}
      >
        <RecordSectionHeader
          title={title}
          isOpen={isOpen}
          onToggle={() => setIsOpen((current) => !current)}
          metrics={metricContent}
          actions={actions}
          noticeMessage={noticeMessage}
          noticeError={noticeError}
          noticeInfo={noticeInfo}
          error={error}
        />
        {isOpen ? (
          <>
            {statusPanel}
            <div
              data-record-section-type={sectionType}
              data-record-section-capabilities={capabilities ? JSON.stringify(capabilities) : undefined}
              className={joinRecordSectionClasses(
                flush ? "px-0 py-5" : "px-5 py-5",
                RECORD_SECTION_BODY_SURFACE_CLASS_NAME,
                bodyClassName,
              )}
            >
              {children}
            </div>
          </>
        ) : null}
      </section>
    </TableBleed>
  )
}
