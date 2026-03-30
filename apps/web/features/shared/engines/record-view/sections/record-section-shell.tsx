"use client"

import { type ReactNode, useEffect, useRef, useState } from "react"
import { TableBleed } from "@/features/dashboard/shared/table/table-shell"
import { RecordFormNotices } from "../feedback"
import { RecordSectionHeader } from "./record-section-header"
import { RecordSectionMetric, type RecordSectionMetricValue } from "./record-section-metric"
import {
  joinRecordSectionClasses,
  RECORD_SECTION_BODY_SURFACE_CLASS_NAME,
  RECORD_SECTION_BORDER_CLASS_NAME,
  RECORD_SECTION_SHELL_CLASS_NAME,
} from "./record-section-tokens"

export function RecordSectionShell({
  title,
  children,
  metrics,
  actions,
  statusPanel,
  noticeMessage,
  noticeError,
  defaultOpen = true,
  onOpenChange,
  bodyClassName,
  className,
}: {
  title: string
  children: ReactNode
  metrics?: ReactNode | RecordSectionMetricValue[]
  actions?: ReactNode
  statusPanel?: ReactNode
  noticeMessage?: string
  noticeError?: string
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
  bodyClassName?: string
  className?: string
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
      <section className={joinRecordSectionClasses(RECORD_SECTION_SHELL_CLASS_NAME, RECORD_SECTION_BORDER_CLASS_NAME, className)}>
        <RecordSectionHeader
          title={title}
          isOpen={isOpen}
          onToggle={() => setIsOpen((current) => !current)}
          metrics={metricContent}
          actions={actions}
        />
        {isOpen ? (
          <>
            {statusPanel}
            <RecordFormNotices message={noticeMessage} error={noticeError} />
            <div className={joinRecordSectionClasses("px-5 py-5", RECORD_SECTION_BODY_SURFACE_CLASS_NAME, bodyClassName)}>
              {children}
            </div>
          </>
        ) : null}
      </section>
    </TableBleed>
  )
}
