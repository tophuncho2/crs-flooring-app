"use client"

import { Grid, GridEmpty, type GridLayout } from "@/components/grid"
import { PaginateControls } from "@/components/features/paginate"
import {
  formatInventoryImportNumber,
  formatInventoryQuantity,
  formatStableDate,
  type InventoryRow,
} from "@builders/domain"

const INVENTORY_LIST_LAYOUT: GridLayout<InventoryRow> = {
  dataColumns: [
    { key: "inventoryNumber", label: "Inv #", minWidth: 110, grow: 0 },
    { key: "importNumber", label: "Import #", minWidth: 120, grow: 0 },
    { key: "product", label: "Product", minWidth: 200, grow: 1 },
    { key: "itemNumber", label: "Item #", minWidth: 120, grow: 0 },
    { key: "startingStock", label: "Starting Balance", kind: "quantity", minWidth: 140, grow: 0, align: "end" },
    { key: "totalCutSum", label: "Cut Balance", kind: "quantity", minWidth: 130, grow: 0, align: "end" },
    { key: "stockBalance", label: "Available", kind: "quantity", minWidth: 130, grow: 0, align: "end" },
    { key: "warehouse", label: "Warehouse", minWidth: 160, grow: 1 },
    { key: "dyeLot", label: "Dye Lot", minWidth: 120, grow: 0 },
    { key: "updated", label: "Updated", minWidth: 120, grow: 0 },
  ],
}

export function InventoryTable({
  rows,
  page,
  totalPages,
  pageSize,
  totalItems,
  hasPreviousPage,
  hasNextPage,
  onPreviousPage,
  onNextPage,
  onOpenInventory,
}: {
  rows: InventoryRow[]
  page: number
  totalPages: number
  pageSize: number
  totalItems: number
  hasPreviousPage: boolean
  hasNextPage: boolean
  onPreviousPage: () => void
  onNextPage: () => void
  onOpenInventory: (id: string) => void
}) {
  return (
    <Grid<InventoryRow>
      rows={rows}
      layout={INVENTORY_LIST_LAYOUT}
      empty={<GridEmpty>No inventory rows match these filters.</GridEmpty>}
      onRowClick={(row) => onOpenInventory(row.id)}
      getRowAriaLabel={(row) => `Open inventory item ${row.itemNumber}`}
      renderCell={(column, row) => {
        switch (column.key) {
          case "inventoryNumber":
            return <span className="font-medium">{row.inventoryNumber}</span>
          case "importNumber":
            return (
              <span className="font-medium text-blue-500">
                {formatInventoryImportNumber(row.importNumber)}
              </span>
            )
          case "product":
            return row.productName || "-"
          case "itemNumber":
            return row.itemNumber || "-"
          case "startingStock":
            return (
              <span className="tabular-nums">
                {formatInventoryQuantity(row.startingStock, row.stockUnitAbbrev)}
              </span>
            )
          case "totalCutSum":
            return (
              <span className="tabular-nums">
                {formatInventoryQuantity(row.totalCutSum, row.stockUnitAbbrev)}
              </span>
            )
          case "stockBalance":
            return (
              <span className="font-semibold tabular-nums">
                {formatInventoryQuantity(row.stockBalance, row.stockUnitAbbrev)}
              </span>
            )
          case "warehouse":
            return row.importWarehouseName || row.warehouseName || "-"
          case "dyeLot":
            return row.dyeLot || "-"
          case "updated":
            return formatStableDate(row.updatedAt)
          default:
            return "-"
        }
      }}
      footerSlot={
        <PaginateControls
          page={page}
          pageSize={pageSize}
          totalItems={totalItems}
          totalPages={totalPages}
          hasPreviousPage={hasPreviousPage}
          hasNextPage={hasNextPage}
          onPreviousPage={onPreviousPage}
          onNextPage={onNextPage}
        />
      }
    />
  )
}
