"use client"

import type { InventoryRow } from "@builders/domain"
import type { GridColumn } from "@/engines/record-view"

/**
 * Candidate-row columns for the merge picker's `BatchSelectGrid` (record-view
 * engine Grid). Read-only identity + balance for an inventory row being
 * considered for a merge: Inv # / Roll # / Dye lot / Note / Balance. The
 * engine boundary forbids reusing the list-view `INVENTORY_LIST_COLUMNS` here,
 * so these are defined module-local against the engine column contract.
 */
function text(value: string): string {
  return value && value.trim().length > 0 ? value : "—"
}

export const INVENTORY_MERGE_COLUMNS: ReadonlyArray<GridColumn<InventoryRow>> = [
  {
    key: "inventoryNumber",
    label: "Inv #",
    minWidth: 96,
    render: (row) => <span className="font-medium">{text(row.inventoryNumber)}</span>,
  },
  {
    key: "rollNumber",
    label: "Roll #",
    minWidth: 110,
    render: (row) => <span>{text(row.rollNumber)}</span>,
  },
  {
    key: "dyeLot",
    label: "Dye Lot",
    minWidth: 110,
    render: (row) => <span>{text(row.dyeLot)}</span>,
  },
  {
    key: "note",
    label: "Note",
    minWidth: 140,
    grow: 1,
    render: (row) => <span className="truncate">{text(row.note)}</span>,
  },
  {
    key: "stockBalance",
    label: "Balance",
    minWidth: 110,
    align: "end",
    render: (row) => (
      <span className="tabular-nums">
        {row.stockBalance}
        {row.stockUnitAbbrev ? ` ${row.stockUnitAbbrev}` : ""}
      </span>
    ),
  },
]
