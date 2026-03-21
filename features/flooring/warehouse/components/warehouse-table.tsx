"use client"

import { ClickableTableRow, TableHead, TableHeaderCell, TableShell } from "@/features/flooring/shared/table-shell"
import type { WarehouseDraft, WarehouseRow } from "../types"

export function WarehouseTable({
  rows,
  getDraft,
  onOpen,
  onDraftChange,
  onDraftBlur,
}: {
  rows: WarehouseRow[]
  getDraft: (row: WarehouseRow) => WarehouseDraft
  onOpen: (row: WarehouseRow) => void
  onDraftChange: (id: string, field: keyof WarehouseDraft, value: string) => void
  onDraftBlur: (row: WarehouseRow) => void | Promise<void>
}) {
  return (
    <TableShell minWidthClass="min-w-full">
      <TableHead>
        <tr>
          <TableHeaderCell>Warehouse</TableHeaderCell>
          <TableHeaderCell>Address</TableHeaderCell>
          <TableHeaderCell>Store Phone</TableHeaderCell>
          <TableHeaderCell>Sections</TableHeaderCell>
          <TableHeaderCell>Locations</TableHeaderCell>
          <TableHeaderCell>Work Orders</TableHeaderCell>
        </tr>
      </TableHead>
      <tbody>
        {rows.map((row) => {
          const draft = getDraft(row)

          return (
            <ClickableTableRow key={row.id} ariaLabel={`Open warehouse ${row.name}`} onClick={() => onOpen(row)} className="transition">
              <td className="px-3 py-2">
                <input
                  value={draft.name}
                  onClick={(event) => event.stopPropagation()}
                  onKeyDown={(event) => event.stopPropagation()}
                  onChange={(event) => onDraftChange(row.id, "name", event.target.value)}
                  onBlur={() => void onDraftBlur(row)}
                  className="w-44 rounded border border-[var(--panel-border)] bg-transparent px-2 py-1"
                />
              </td>
              <td className="px-3 py-2">
                <input
                  value={draft.address}
                  onClick={(event) => event.stopPropagation()}
                  onKeyDown={(event) => event.stopPropagation()}
                  onChange={(event) => onDraftChange(row.id, "address", event.target.value)}
                  onBlur={() => void onDraftBlur(row)}
                  className="w-[34rem] rounded border border-[var(--panel-border)] bg-transparent px-2 py-1"
                />
              </td>
              <td className="px-3 py-2">
                <input
                  value={draft.phone}
                  onClick={(event) => event.stopPropagation()}
                  onKeyDown={(event) => event.stopPropagation()}
                  onChange={(event) => onDraftChange(row.id, "phone", event.target.value)}
                  onBlur={() => void onDraftBlur(row)}
                  className="w-40 rounded border border-[var(--panel-border)] bg-transparent px-2 py-1"
                />
              </td>
              <td className="px-3 py-2">{row.sectionsCount}</td>
              <td className="px-3 py-2">{row.locationsCount}</td>
              <td className="px-3 py-2">{row.workOrdersCount}</td>
            </ClickableTableRow>
          )
        })}
      </tbody>
    </TableShell>
  )
}
