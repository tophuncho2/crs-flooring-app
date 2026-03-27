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
  collapsible = true,
  beforeTable,
  afterTable,
  children,
}: {
  title: string
  titleMeta?: ReactNode
  actions?: ReactNode
  minWidthClass?: string
  defaultOpen?: boolean
  collapsible?: boolean
  beforeTable?: ReactNode
  afterTable?: ReactNode
  children: ReactNode
}) {
  return (
    <CollapsibleTableSection
      title={title}
      titleMeta={titleMeta}
      actions={actions}
      defaultOpen={defaultOpen}
      collapsible={collapsible}
    >
      <div className="space-y-4">
        {beforeTable}
        <ModalTableShell minWidthClass={minWidthClass}>{children}</ModalTableShell>
        {afterTable}
      </div>
    </CollapsibleTableSection>
  )
}

export { ModalTableHead }
