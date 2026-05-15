import type { GridLayout } from "@/components/grid"
import type { InventoryRow } from "@builders/domain"

/**
 * Column layout for the inventory list-view grid. Order in `dataColumns`
 * is the visual left-to-right order in the table. `minWidth` is the
 * column's preferred track width; `grow: 1` columns absorb extra
 * horizontal space when the viewport is wider than the sum of preferred
 * widths.
 */
export const INVENTORY_LIST_LAYOUT: GridLayout<InventoryRow> = {
  dataColumns: [
    { key: "stockBalance", label: "Stock", kind: "quantity", minWidth: 140, grow: 0, align: "start" },
    { key: "totalCutSum", label: "Cut", kind: "quantity", minWidth: 130, grow: 0, align: "end" },
    { key: "productName", label: "Product", minWidth: 200, grow: 1 },
    { key: "inventoryNumber", label: "Inv #", minWidth: 110, grow: 0 },
    { key: "rollNumber", label: "Roll #", minWidth: 160, grow: 0 },
    { key: "location", label: "Location", minWidth: 180, grow: 0 },
    { key: "dyeLot", label: "Dye Lot", minWidth: 160, grow: 0 },
    { key: "note", label: "Note", minWidth: 180, grow: 1 },
    { key: "coverageBalance", label: "Coverage", kind: "quantity", minWidth: 150, grow: 0, align: "end" },
    { key: "warehouse", label: "Warehouse", minWidth: 110, grow: 0 },
    { key: "fifoReceivedAt", label: "FIFO Received", minWidth: 150, grow: 0 },
    { key: "updatedAt", label: "Updated", minWidth: 120, grow: 0 },
  ],
}
