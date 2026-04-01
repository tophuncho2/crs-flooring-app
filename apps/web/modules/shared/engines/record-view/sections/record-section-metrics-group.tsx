import type { ReactNode } from "react"
import { joinRecordSectionClasses } from "./record-section-tokens"

export function RecordSectionMetricsGroup({
  children,
  className,
}: {
  children?: ReactNode
  className?: string
}) {
  if (!children) {
    return null
  }

  return (
    <div className={joinRecordSectionClasses("hidden md:flex md:flex-wrap md:items-start md:justify-end md:gap-2", className)}>
      {children}
    </div>
  )
}
