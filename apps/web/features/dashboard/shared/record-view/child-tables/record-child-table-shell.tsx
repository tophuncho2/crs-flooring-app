"use client"

import type { ReactNode } from "react"
import { CollapsibleTableSection } from "@/features/dashboard/shared/record-view/child-tables/collapsible-table-section"
import { ModalTableHead, ModalTableShell, TableBleed, type TableBleedVariant } from "@/features/dashboard/shared/table/table-shell"

function joinClasses(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ")
}

export function RecordChildTableShell({
  minWidthClass = "min-w-full",
  bleedVariant = "nested",
  surface = "card",
  className,
  children,
}: {
  minWidthClass?: string
  bleedVariant?: TableBleedVariant | "none"
  surface?: "card" | "plain"
  className?: string
  children: ReactNode
}) {
  const content =
    surface === "plain" ? (
      <div className={joinClasses("w-full overflow-x-auto", className)}>
        <table className={joinClasses("w-full text-sm", minWidthClass)}>{children}</table>
      </div>
    ) : (
      <ModalTableShell minWidthClass={minWidthClass} className={joinClasses("w-full", className)}>
        {children}
      </ModalTableShell>
    )

  if (bleedVariant === "none") {
    return content
  }

  return (
    <TableBleed variant={bleedVariant}>
      {content}
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
