"use client"

import { ClickableTableRow, TableHead, TableHeaderCell, TableShell } from "@/features/flooring/shared/table-shell"
import type { WarehouseRow } from "../types"

export function WarehouseTable({
  rows,
  onOpen,
}: {
  rows: WarehouseRow[]
  onOpen: (row: WarehouseRow) => void
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
          return (
            <ClickableTableRow key={row.id} ariaLabel={`Open warehouse ${row.name}`} onClick={() => onOpen(row)} className="transition">
              <td className="px-3 py-2 font-medium text-blue-500">{row.name}</td>
              <td className="px-3 py-2">{row.address || "-"}</td>
              <td className="px-3 py-2">{row.phone || "-"}</td>
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
