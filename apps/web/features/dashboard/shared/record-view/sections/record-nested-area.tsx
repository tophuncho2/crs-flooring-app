import type { ReactNode } from "react"
import { joinRecordSectionClasses } from "@/features/dashboard/shared/record-view/sections/record-section-tokens"

export function RecordNestedArea({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return <div className={joinRecordSectionClasses(className)}>{children}</div>
}
