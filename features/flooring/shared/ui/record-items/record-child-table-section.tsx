"use client"

import type { ReactNode } from "react"
import { CollapsibleTableSection } from "@/features/flooring/shared/ui/table/collapsible-table-section"
import { ModalTableHead, ModalTableShell } from "@/features/flooring/shared/ui/table/table-shell"

export function RecordChildTableSection({
  title,
  actions,
  minWidthClass = "min-w-full",
  defaultOpen = true,
  children,
}: {
  title: string
  actions?: ReactNode
  minWidthClass?: string
  defaultOpen?: boolean
  children: ReactNode
}) {
  return (
    <CollapsibleTableSection title={title} actions={actions} defaultOpen={defaultOpen}>
      <ModalTableShell minWidthClass={minWidthClass}>{children}</ModalTableShell>
    </CollapsibleTableSection>
  )
}

export { ModalTableHead }
