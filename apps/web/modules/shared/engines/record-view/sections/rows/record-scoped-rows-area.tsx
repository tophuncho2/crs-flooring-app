import type { ReactNode } from "react"
import { joinRecordSectionClasses } from "../structure/record-section-tokens"

export function RecordScopedRowsArea({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return <div className={joinRecordSectionClasses(className)}>{children}</div>
}
