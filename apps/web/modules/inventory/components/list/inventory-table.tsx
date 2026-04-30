"use client"

import { Grid, GridEmpty, type GridColumn, type GridLayout } from "@/components/grid"
import { PaginateControls } from "@/components/features/paginate"
import {
  formatInventoryImportNumber,
  formatInventoryQuantity,
  formatStableDate,
  type InventoryRow,
} from "@builders/domain"

const INVENTORY_LIST_COLUMNS_BY_KEY: Record<string, GridColumn<InventoryRow>> = {
  inventoryNumber: { key: "inventoryNumber", label: "Inv #", minWidth: 110, grow: 0 },
  importNumber: { key: "importNumber", label: "Import #", minWidth: 120, grow: 0 },
  product: { key: "product", label: "Product", minWidth: 200, grow: 1 },
  itemNumber: { key: "itemNumber", label: "Item #", minWidth: 120, grow: 0 },
  startingStock: { key: "startingStock", label: "Starting Balance", kind: "quantity", minWidth: 140, grow: 0, align: "end" },
  totalCutSum: { key: "totalCutSum", label: "Cut Balance", kind: "quantity", minWidth: 130, grow: 0, align: "end" },
  stockBalance: { key: "stockBalance", label: "Available", kind: "quantity", minWidth: 130, grow: 0, align: "end" },
  coverageBalance: { key: "coverageBalance", label: "Coverage", kind: "quantity", minWidth: 120, grow: 0, align: "end" },
  section: { key: "section", label: "Section", minWidth: 110, grow: 0 },
  location: { key: "location", label: "Location", minWidth: 130, grow: 0 },
  warehouse: { key: "warehouse", label: "Warehouse", minWidth: 160, grow: 1 },
  fullLocation: { key: "fullLocation", label: "Full Location", minWidth: 160, grow: 0 },
  dyeLot: { key: "dyeLot", label: "Dye Lot", minWidth: 120, grow: 0 },
  notes: { key: "notes", label: "Notes", minWidth: 200, grow: 1 },
  updated: { key: "updated", label: "Updated", minWidth: 120, grow: 0 },
}

export function InventoryTable({
  rows,
  visibleColumns,
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
  visibleColumns: Array<{ key: string; label: string }>
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
  const dataColumns = visibleColumns
    .map((column) => INVENTORY_LIST_COLUMNS_BY_KEY[column.key])
    .filter((column): column is GridColumn<InventoryRow> => Boolean(column))

  const layout: GridLayout<InventoryRow> = { dataColumns }

  return (
    <Grid<InventoryRow>
      rows={rows}
      layout={layout}
      empty={<GridEmpty>No live inventory rows yet.</GridEmpty>}
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
          case "coverageBalance":
            return (
              <span className="tabular-nums">
                {row.coverageBalance
                  ? formatInventoryQuantity(row.coverageBalance, row.itemCoverageUnitAbbrev)
                  : "-"}
              </span>
            )
          case "section":
            return row.sectionNumber || "-"
          case "location":
            return row.locationShortCode || "-"
          case "warehouse":
            return row.importWarehouseName || row.warehouseName || "-"
          case "fullLocation":
            return row.locationCode || "-"
          case "dyeLot":
            return row.dyeLot || "-"
          case "notes":
            return row.notes || "-"
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
