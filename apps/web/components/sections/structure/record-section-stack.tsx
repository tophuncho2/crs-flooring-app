import type { ReactNode } from "react"
import { joinRecordSectionClasses } from "./record-section-tokens"

export function RecordSectionStack({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return <div className={joinRecordSectionClasses("space-y-6", className)}>{children}</div>
}
