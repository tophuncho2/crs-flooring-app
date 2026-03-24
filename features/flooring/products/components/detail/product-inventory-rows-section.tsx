"use client"

import { useMemo } from "react"
import { calculateProductInventorySummary } from "@/features/flooring/products/domain/inventory-summary"
import { ModalTableHead, RecordChildTableSection } from "@/features/flooring/shared/ui/record-items/record-child-table-section"
import { TableEmptyRow, TableGroupRow, TableHeaderCell } from "@/features/flooring/shared/ui/table/table-shell"

type InventoryRow = {
  id: string
  importNumber: string
  itemNumber: string
  dyeLot: string
  locationCode: string
  warehouseName: string
  sectionName: string
  stockCount: string
  cutTotal: string
  runningBalance: string
  cost: string
  freight: string
  stockUnit: string
}

export function ProductInventoryRowsSection({
  inventoryRows,
}: {
  inventoryRows: InventoryRow[]
}) {
  const summary = useMemo(() => calculateProductInventorySummary(inventoryRows), [inventoryRows])
  const rowsByWarehouse = useMemo(() => {
    const grouped = new Map<string, InventoryRow[]>()

    for (const row of inventoryRows) {
      const warehouseName = row.warehouseName || "Unassigned Warehouse"
      const current = grouped.get(warehouseName) ?? []
      current.push(row)
      grouped.set(warehouseName, current)
    }

    return Array.from(grouped.entries())
  }, [inventoryRows])

  return (
    <RecordChildTableSection
      title="Inventory Rows"
      titleMeta={summary.totalCostLabel}
      actions={<span className="text-xs text-[var(--foreground)]/60">{summary.rowCount} rows</span>}
      minWidthClass="min-w-[980px]"
      defaultOpen
    >
      <ModalTableHead>
        <tr>
          <TableHeaderCell>Item #</TableHeaderCell>
          <TableHeaderCell>Dye Lot</TableHeaderCell>
          <TableHeaderCell>Section</TableHeaderCell>
          <TableHeaderCell>Location</TableHeaderCell>
          <TableHeaderCell>Starting Stock</TableHeaderCell>
          <TableHeaderCell>Cuts Total</TableHeaderCell>
          <TableHeaderCell>Running Balance</TableHeaderCell>
          <TableHeaderCell>Import #</TableHeaderCell>
        </tr>
      </ModalTableHead>
      <tbody>
        {rowsByWarehouse.length === 0 ? (
          <TableEmptyRow message="No inventory rows found for this product." colSpan={8} />
        ) : (
          rowsByWarehouse.map(([warehouseName, warehouseRows]) => (
            warehouseRows.map((row, index) => (
              index === 0 ? [
                <TableGroupRow key={`${warehouseName}-group`} label={warehouseName} colSpan={8} />,
                <tr key={row.id} className="border-t border-[var(--panel-border)]">
                  <td className="px-3 py-2">{row.itemNumber}</td>
                  <td className="px-3 py-2">{row.dyeLot || "-"}</td>
                  <td className="px-3 py-2">{row.sectionName || "-"}</td>
                  <td className="px-3 py-2">{row.locationCode || "-"}</td>
                  <td className="px-3 py-2">{row.stockCount} {row.stockUnit}</td>
                  <td className="px-3 py-2">{row.cutTotal}</td>
                  <td className="px-3 py-2 font-semibold">{row.runningBalance} {row.stockUnit}</td>
                  <td className="px-3 py-2">{row.importNumber ? `IMP-${row.importNumber.padStart(4, "0")}` : "-"}</td>
                </tr>,
              ] : (
                <tr key={row.id} className="border-t border-[var(--panel-border)]">
                  <td className="px-3 py-2">{row.itemNumber}</td>
                  <td className="px-3 py-2">{row.dyeLot || "-"}</td>
                  <td className="px-3 py-2">{row.sectionName || "-"}</td>
                  <td className="px-3 py-2">{row.locationCode || "-"}</td>
                  <td className="px-3 py-2">{row.stockCount} {row.stockUnit}</td>
                  <td className="px-3 py-2">{row.cutTotal}</td>
                  <td className="px-3 py-2 font-semibold">{row.runningBalance} {row.stockUnit}</td>
                  <td className="px-3 py-2">{row.importNumber ? `IMP-${row.importNumber.padStart(4, "0")}` : "-"}</td>
                </tr>
              )
            ))
          ))
        )}
      </tbody>
    </RecordChildTableSection>
  )
}
