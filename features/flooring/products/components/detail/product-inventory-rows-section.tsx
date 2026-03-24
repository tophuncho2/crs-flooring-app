"use client"

import { useMemo, useState } from "react"
import {
  ALL_INVENTORY_STATUS_FILTER,
  ALL_INVENTORY_WAREHOUSE_FILTER,
  filterInventoryRows,
  getEffectiveInventoryWarehouseId,
  parseInventoryStatusFilter,
} from "@/features/flooring/inventory/domain/filters"
import { calculateProductInventorySummary } from "@/features/flooring/products/domain/inventory-summary"
import { TableFilterControls } from "@/features/flooring/shared/ui/table/table-filter-controls"
import { ModalTableHead, RecordChildTableSection } from "@/features/flooring/shared/ui/record-items/record-child-table-section"
import { TableEmptyRow, TableGroupRow, TableHeaderCell } from "@/features/flooring/shared/ui/table/table-shell"

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
  const [statusFilter, setStatusFilter] = useState<typeof ALL_INVENTORY_STATUS_FILTER | "pending" | "final">(ALL_INVENTORY_STATUS_FILTER)
  const [warehouseFilter, setWarehouseFilter] = useState<string>(ALL_INVENTORY_WAREHOUSE_FILTER)
  const filteredRows = useMemo(
    () => filterInventoryRows(inventoryRows, { status: statusFilter, warehouseId: warehouseFilter }),
    [inventoryRows, statusFilter, warehouseFilter],
  )
  const summary = useMemo(() => calculateProductInventorySummary(filteredRows), [filteredRows])
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
    ).map(([id, name]) => ({ value: id, label: name }))
  ), [inventoryRows])
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
  const filterGroups = [
    {
      key: "status",
      type: "tabs" as const,
      value: statusFilter,
      options: [
        { value: ALL_INVENTORY_STATUS_FILTER, label: "All" },
        { value: "pending", label: "Pending" },
        { value: "final", label: "Final" },
      ],
      onChange: (value: string) => setStatusFilter(parseInventoryStatusFilter(value)),
    },
    {
      key: "warehouse",
      type: "select" as const,
      label: "Warehouse",
      value: warehouseFilter,
      options: [
        { value: ALL_INVENTORY_WAREHOUSE_FILTER, label: "All Warehouses" },
        ...warehouseOptions,
      ],
      onChange: setWarehouseFilter,
    },
  ]

  return (
    <RecordChildTableSection
      title="Inventory Rows"
      titleMeta={summary.totalCostLabel}
      actions={(
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-[var(--foreground)]/60">{summary.rowCount} rows</span>
          <TableFilterControls groups={filterGroups} />
        </div>
      )}
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
