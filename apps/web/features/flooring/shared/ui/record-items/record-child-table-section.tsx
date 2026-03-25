"use client"

import type { ReactNode } from "react"
import { CollapsibleTableSection } from "@/features/flooring/shared/ui/table/collapsible-table-section"
import { ModalTableHead, ModalTableShell } from "@/features/flooring/shared/ui/table/table-shell"

export function RecordChildTableSection({
  title,
  titleMeta,
  actions,
  minWidthClass = "min-w-full",
  defaultOpen = true,
  children,
}: {
  title: string
  titleMeta?: ReactNode
  actions?: ReactNode
  minWidthClass?: string
  defaultOpen?: boolean
  children: ReactNode
}) {
  return (
    <CollapsibleTableSection title={title} titleMeta={titleMeta} actions={actions} defaultOpen={defaultOpen}>
      <ModalTableShell minWidthClass={minWidthClass}>{children}</ModalTableShell>
    </CollapsibleTableSection>
  )
}

export { ModalTableHead }
