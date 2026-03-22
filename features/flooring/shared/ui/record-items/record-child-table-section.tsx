"use client"

import type { ReactNode } from "react"
import { CollapsibleTableSection } from "@/features/flooring/shared/ui/table/collapsible-table-section"
import { ModalTableHead, ModalTableShell } from "@/features/flooring/shared/ui/table/table-shell"

export function RecordChildTableSection({
  title,
  description,
  actions,
  minWidthClass = "min-w-full",
  defaultOpen = true,
  children,
}: {
  title: string
  description?: ReactNode
  actions?: ReactNode
  minWidthClass?: string
  defaultOpen?: boolean
  children: ReactNode
}) {
  return (
    <CollapsibleTableSection title={title} actions={actions} defaultOpen={defaultOpen}>
      {description ? <div className="text-sm text-[var(--foreground)]/70">{description}</div> : null}
      <ModalTableShell minWidthClass={minWidthClass}>{children}</ModalTableShell>
    </CollapsibleTableSection>
  )
}

export { ModalTableHead }
