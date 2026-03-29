"use client"

import { type ReactNode, useState } from "react"
import { TableBleed } from "@/features/dashboard/shared/table/table-shell"
import { RecordSectionHeader } from "@/features/dashboard/shared/record-view/sections/record-section-header"
import {
  joinRecordSectionClasses,
  RECORD_SECTION_BODY_SURFACE_CLASS_NAME,
  RECORD_SECTION_BORDER_CLASS_NAME,
  RECORD_SECTION_SHELL_CLASS_NAME,
} from "@/features/dashboard/shared/record-view/sections/record-section-tokens"

export function RecordSectionShell({
  title,
  children,
  metrics,
  actions,
  statusPanel,
  defaultOpen = true,
  onOpenChange,
  bodyClassName,
  className,
}: {
  title: string
  children: ReactNode
  metrics?: ReactNode
  actions?: ReactNode
  statusPanel?: ReactNode
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
  bodyClassName?: string
  className?: string
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  return (
    <TableBleed variant="record">
      <section className={joinRecordSectionClasses(RECORD_SECTION_SHELL_CLASS_NAME, RECORD_SECTION_BORDER_CLASS_NAME, className)}>
        <RecordSectionHeader
          title={title}
          isOpen={isOpen}
          onToggle={() =>
            setIsOpen((current) => {
              const next = !current
              onOpenChange?.(next)
              return next
            })
          }
          metrics={metrics}
          actions={actions}
        />
        {isOpen ? (
          <>
            {statusPanel}
            <div className={joinRecordSectionClasses("px-5 py-5", RECORD_SECTION_BODY_SURFACE_CLASS_NAME, bodyClassName)}>
              {children}
            </div>
          </>
        ) : null}
      </section>
    </TableBleed>
  )
}
