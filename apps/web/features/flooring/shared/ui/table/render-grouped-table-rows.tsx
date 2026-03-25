"use client"

import type { ReactNode } from "react"
import type { GroupedRowTree } from "@/features/flooring/shared/controllers/table/use-table-controls"
import { TableGroupRow } from "./table-shell"

export function renderGroupedTableRows<T>({
  groups,
  colSpan,
  renderRow,
  variant = "page",
  renderGroupLabel,
}: {
  groups: GroupedRowTree<T>[]
  colSpan: number
  renderRow: (row: T) => ReactNode
  variant?: "page" | "modal"
  renderGroupLabel?: (group: GroupedRowTree<T>) => string
}): ReactNode[] {
  const getGroupLabel = renderGroupLabel ?? ((group: GroupedRowTree<T>) => `${group.fieldLabel}: ${group.label}`)

  return groups.flatMap((group) => [
    <TableGroupRow
      key={`${group.depth}-${group.key}`}
      label={getGroupLabel(group)}
      depth={group.depth}
      colSpan={colSpan}
      variant={variant}
    />,
    ...(group.children.length > 0
      ? renderGroupedTableRows({
          groups: group.children,
          colSpan,
          renderRow,
          variant,
          renderGroupLabel,
        })
      : group.rows.map((row) => renderRow(row))),
  ])
}
