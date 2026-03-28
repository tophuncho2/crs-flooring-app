"use client"

import type { ReactNode } from "react"
import { CollapsibleTableSection } from "@/features/dashboard/shared/record-view/child-tables/collapsible-table-section"
import { ModalTableHead, ModalTableShell, TableBleed, type TableBleedVariant } from "@/features/dashboard/shared/table/table-shell"

export function RecordChildTableShell({
  minWidthClass = "min-w-full",
  bleedVariant = "nested",
  children,
}: {
  minWidthClass?: string
  bleedVariant?: TableBleedVariant | "none"
  children: ReactNode
}) {
  if (bleedVariant === "none") {
    return (
      <ModalTableShell minWidthClass={minWidthClass} className="w-full">
        {children}
      </ModalTableShell>
    )
  }

  return (
    <TableBleed variant={bleedVariant}>
      <ModalTableShell minWidthClass={minWidthClass} className="w-full">
        {children}
      </ModalTableShell>
    </TableBleed>
  )
}

export function RecordChildTableSection({
  title,
  titleMeta,
  actions,
  minWidthClass = "min-w-full",
  defaultOpen = true,
  collapsible = true,
  beforeTable,
  afterTable,
  bleedVariant = "nested",
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
  bleedVariant?: TableBleedVariant | "none"
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
        <RecordChildTableShell minWidthClass={minWidthClass} bleedVariant={bleedVariant}>
          {children}
        </RecordChildTableShell>
        {afterTable}
      </div>
    </CollapsibleTableSection>
  )
}

export { ModalTableHead }
