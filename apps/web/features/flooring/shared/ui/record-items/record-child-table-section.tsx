"use client"

import type { ReactNode } from "react"
import { CollapsibleTableSection } from "@/features/flooring/shared/ui/table/collapsible-table-section"
import { ModalTableHead, ModalTableShell, TableBleed, type TableBleedVariant } from "@/features/flooring/shared/ui/table/table-shell"

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
        {bleedVariant === "none" ? (
          <ModalTableShell minWidthClass={minWidthClass} className="w-full">
            {children}
          </ModalTableShell>
        ) : (
          <TableBleed variant={bleedVariant}>
            <ModalTableShell minWidthClass={minWidthClass} className="w-full">
              {children}
            </ModalTableShell>
          </TableBleed>
        )}
        {afterTable}
      </div>
    </CollapsibleTableSection>
  )
}

export { ModalTableHead }
