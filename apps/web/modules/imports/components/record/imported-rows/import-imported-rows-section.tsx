"use client"

import { ActionHeader } from "@/components/headers"
import { StatusBadge } from "@/components/badges"
import { CurrencyCell, TextCell, UnitCell } from "@/components/cells"
import { Grid, GridEmpty, type GridLayout } from "@/components/grid"
import type { StagedInventoryRow } from "@builders/domain"

const IMPORTED_ROWS_LAYOUT: GridLayout<StagedInventoryRow> = {
  dataColumns: [
    { key: "product", label: "Product", minWidth: 220, preferredWidth: 320, grow: 1.5 },
    { key: "itemNumber", label: "Item #", minWidth: 116, grow: 0 },
    { key: "startingStock", label: "Starting Stock", minWidth: 156, grow: 0, align: "center" },
    { key: "location", label: "Location", minWidth: 196, grow: 0 },
    { key: "dyeLot", label: "Dye Lot", minWidth: 124, grow: 0 },
    { key: "cost", label: "Cost", kind: "currency", minWidth: 116, grow: 0, align: "end" },
    { key: "freight", label: "Freight", kind: "currency", minWidth: 116, grow: 0, align: "end" },
    { key: "notes", label: "Notes", minWidth: 240, grow: 1.2 },
  ],
  trailingControls: [{ key: "status", kind: "status-indicator", width: 132 }],
}

export function ImportImportedRowsSection({ rows }: { rows: StagedInventoryRow[] }) {
  return (
    <div className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel-background)]">
      <ActionHeader
        title="Imported Rows"
        summary={
          <span>
            {rows.length} row{rows.length === 1 ? "" : "s"}
          </span>
        }
      />

      <Grid<StagedInventoryRow>
        rows={rows}
        layout={IMPORTED_ROWS_LAYOUT}
        empty={<GridEmpty>No rows have been imported yet.</GridEmpty>}
        renderCell={(column, row) => {
          switch (column.key) {
            case "product":
              return (
                <TextCell editable={false} value={row.productName} ariaLabel={`${row.productName} product`} />
              )
            case "itemNumber":
              return (
                <TextCell editable={false} value={row.itemNumber} ariaLabel={`${row.itemNumber} item number`} />
              )
            case "startingStock":
              return (
                <UnitCell
                  editable={false}
                  value={row.startingStock}
                  unit={row.stockUnit || "unit"}
                  ariaLabel={`${row.itemNumber} starting stock`}
                />
              )
            case "location":
              return (
                <TextCell editable={false} value={row.locationCode || "—"} ariaLabel={`${row.itemNumber} location`} />
              )
            case "dyeLot":
              return (
                <TextCell editable={false} value={row.dyeLot || "—"} ariaLabel={`${row.itemNumber} dye lot`} />
              )
            case "cost":
              return (
                <CurrencyCell editable={false} value={row.cost} ariaLabel={`${row.itemNumber} cost`} />
              )
            case "freight":
              return (
                <CurrencyCell editable={false} value={row.freight} ariaLabel={`${row.itemNumber} freight`} />
              )
            case "notes":
              return (
                <TextCell editable={false} value={row.notes || "—"} ariaLabel={`${row.itemNumber} notes`} />
              )
            default:
              return null
          }
        }}
        renderControl={(control) => {
          if (control.kind === "status-indicator") {
            return <StatusBadge tone="success">Imported</StatusBadge>
          }
          return null
        }}
      />
    </div>
  )
}
