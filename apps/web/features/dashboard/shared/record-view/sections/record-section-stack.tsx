import type { ReactNode } from "react"
import { joinRecordSectionClasses } from "@/features/dashboard/shared/record-view/sections/record-section-tokens"

export function RecordSectionStack({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return <div className={joinRecordSectionClasses("space-y-0", className)}>{children}</div>
}
