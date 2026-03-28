import type { ReactNode } from "react"
import { RecordItemCell } from "@/features/dashboard/shared/record-view/sections/record-item-cell"

export function RecordInlineActionsCell({
  children,
  className,
  contentClassName,
}: {
  children: ReactNode
  className?: string
  contentClassName?: string
}) {
  return (
    <RecordItemCell
      label="Actions"
      className={className}
      contentClassName={contentClassName ?? "flex h-full flex-col gap-2"}
    >
      {children}
    </RecordItemCell>
  )
}
