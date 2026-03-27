"use client"

import { useMemo } from "react"
import {
  filterInventoryRows,
  getEffectiveInventoryWarehouseId,
  parseInventoryStatusFilter,
  parseInventoryWarehouseFilter,
} from "@/features/flooring/inventory/domain/filters"
import { createInventoryChildFilterDefinitions } from "@/features/flooring/inventory/table-filters"
import { calculateProductInventorySummary } from "@/features/flooring/products/domain/inventory-summary"
import { useLocalTableFilters } from "@/features/flooring/shared/controllers/table/use-local-table-filters"
import { TableFilterControls } from "@/features/dashboard/shared/table/table-filter-controls"
import { ModalTableHead, RecordChildTableSection } from "@/features/flooring/shared/line-items/record-child-table-section"
import { TableEmptyRow, TableGroupRow, TableHeaderCell } from "@/features/dashboard/shared/table/table-shell"

type InventoryRow = {
  id: string
  importEntryId: string
  importWarehouseId: string
  importNumber: string
  importStatus: string
  importWarehouseName: string
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
  const warehouseOptions = useMemo(() => (
    Array.from(
      inventoryRows.reduce((options, row) => {
        const warehouseId = getEffectiveInventoryWarehouseId(row)
        const warehouseName = row.importWarehouseName || row.warehouseName || "Unassigned Warehouse"

        if (warehouseId && !options.has(warehouseId)) {
          options.set(warehouseId, warehouseName)
        }

        return options
      }, new Map<string, string>()),
    ).map(([id, name]) => ({ id, name }))
  ), [inventoryRows])
  const childFilterDefinitions = useMemo(
    () => createInventoryChildFilterDefinitions(warehouseOptions),
    [warehouseOptions],
  )
  const childFilters = useLocalTableFilters({
    definitions: childFilterDefinitions,
  })
  const filteredRows = useMemo(
    () => filterInventoryRows(inventoryRows, {
      status: parseInventoryStatusFilter(childFilters.filters.status ?? []),
      warehouseId: parseInventoryWarehouseFilter(childFilters.filters.warehouseId ?? []),
    }),
    [childFilters.filters.status, childFilters.filters.warehouseId, inventoryRows],
  )
  const summary = useMemo(() => calculateProductInventorySummary(filteredRows), [filteredRows])
  const rowsByWarehouse = useMemo(() => {
    const grouped = new Map<string, InventoryRow[]>()

    for (const row of filteredRows) {
      const warehouseName = row.importWarehouseName || row.warehouseName || "Unassigned Warehouse"
      const current = grouped.get(warehouseName) ?? []
      current.push(row)
      grouped.set(warehouseName, current)
    }

    return Array.from(grouped.entries())
  }, [filteredRows])

  return (
    <RecordChildTableSection
      title="Inventory Rows"
      titleMeta={summary.totalCostLabel}
      actions={(
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-[var(--foreground)]/60">{summary.rowCount} rows</span>
          <TableFilterControls groups={childFilters.filterGroups} />
        </div>
      )}
      minWidthClass="min-w-[1180px]"
      defaultOpen
    >
      <ModalTableHead>
        <tr>
          <TableHeaderCell>Item #</TableHeaderCell>
          <TableHeaderCell>Dye Lot</TableHeaderCell>
          <TableHeaderCell>Section</TableHeaderCell>
          <TableHeaderCell>Location</TableHeaderCell>
          <TableHeaderCell>Cost</TableHeaderCell>
          <TableHeaderCell>Freight</TableHeaderCell>
          <TableHeaderCell>Starting Stock</TableHeaderCell>
          <TableHeaderCell>Cuts Total</TableHeaderCell>
          <TableHeaderCell>Running Balance</TableHeaderCell>
          <TableHeaderCell>Import #</TableHeaderCell>
        </tr>
      </ModalTableHead>
      <tbody>
        {rowsByWarehouse.length === 0 ? (
          <TableEmptyRow message="No inventory rows found for this product." colSpan={10} />
        ) : (
          rowsByWarehouse.map(([warehouseName, warehouseRows]) => (
            warehouseRows.map((row, index) => (
              index === 0 ? [
                <TableGroupRow key={`${warehouseName}-group`} label={warehouseName} colSpan={10} variant="modal" />,
                <tr key={row.id} className="border-t border-[var(--panel-border)]">
                  <td className="px-3 py-2">{row.itemNumber}</td>
                  <td className="px-3 py-2">{row.dyeLot || "-"}</td>
                  <td className="px-3 py-2">{row.sectionName || "-"}</td>
                  <td className="px-3 py-2">{row.locationCode || "-"}</td>
                  <td className="px-3 py-2">{row.cost || "-"}</td>
                  <td className="px-3 py-2">{row.freight || "-"}</td>
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
                  <td className="px-3 py-2">{row.cost || "-"}</td>
                  <td className="px-3 py-2">{row.freight || "-"}</td>
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
