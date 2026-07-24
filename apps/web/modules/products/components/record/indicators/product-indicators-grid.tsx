"use client"

import { NumberCell, TextCell, ToggleCell } from "@/engines/record-view"
import { DataTable, type DataTableColumn } from "@/engines/list-view"
import { RecordDeleteButton } from "@/engines/common"
import { IndicatorStatusChip } from "@/modules/inventory-indicators"
import {
  INVENTORY_INDICATOR_INTERNAL_NOTES_MAX,
  type InventoryIndicatorRow,
} from "@builders/domain"

const PRODUCT_INDICATORS_COLUMNS: DataTableColumn<InventoryIndicatorRow>[] = [
  // Read-only identity/derived columns, then the editable trio (threshold /
  // active / notes). The identity triple (warehouse / unit) is create-only.
  { key: "indicatorNumber", label: "Indicator #", width: 120 },
  { key: "warehouseName", label: "Warehouse", minWidth: 160, grow: 1 },
  { key: "unit", label: "Unit", width: 110 },
  { key: "status", label: "Status", width: 130 },
  { key: "onHand", label: "On Hand", width: 120, align: "end" },
  { key: "lowStockThreshold", label: "Low Threshold", width: 140, align: "end" },
  { key: "isActive", label: "Active", width: 100 },
  { key: "notes", label: "Notes", width: 260 },
]

/**
 * Pure editable-table body for the product record view's Inventory Indicators
 * section. The section chrome (title, sub-header, save/discard/add) lives in the
 * host panel; this is just the grid. Mirrors the templates planned-products grid.
 */
export function ProductIndicatorsGrid({
  items,
  editable,
  onChangeField,
  onRemoveRow,
}: {
  items: InventoryIndicatorRow[]
  editable: boolean
  onChangeField: (
    itemId: string,
    field: "lowStockThreshold" | "internalNotes" | "isActive",
    value: string | boolean,
  ) => void
  onRemoveRow: (itemId: string) => void
}) {
  return (
    <DataTable<InventoryIndicatorRow>
      variant="editable"
      flush
      rows={items}
      columns={PRODUCT_INDICATORS_COLUMNS}
      empty="No indicators yet."
      rowActions={(row) => (
        <RecordDeleteButton
          ariaLabel="Remove indicator"
          title={editable ? "Remove this indicator" : "Saving..."}
          disabled={!editable}
          onClick={() => onRemoveRow(row.id)}
        />
      )}
      renderCell={(column, row) => {
        switch (column.key) {
          case "indicatorNumber":
            return <span className="text-[var(--foreground)]/85">{row.indicatorNumber}</span>
          case "warehouseName":
            return <span className="text-[var(--foreground)]/85">{row.warehouseName || "—"}</span>
          case "unit":
            return (
              <span className="text-[var(--foreground)]/85">
                {row.unitAbbrev || row.unitName || "—"}
              </span>
            )
          case "status":
            return <IndicatorStatusChip status={row.status} label={row.statusLabel} />
          case "onHand":
            return (
              <span className="text-[var(--foreground)]/85">
                {`${row.currentStock}${row.unitAbbrev ? ` ${row.unitAbbrev}` : ""}`}
              </span>
            )
          case "lowStockThreshold":
            return (
              <NumberCell
                editable={editable}
                align="end"
                value={row.lowStockThreshold}
                onChange={(value) => onChangeField(row.id, "lowStockThreshold", value)}
                ariaLabel="Low stock threshold"
              />
            )
          case "isActive":
            return (
              <ToggleCell
                editable={editable}
                value={row.isActive}
                onChange={(value) => onChangeField(row.id, "isActive", value)}
                ariaLabel="Indicator active"
              />
            )
          case "notes":
            return (
              <TextCell
                editable={editable}
                value={row.internalNotes}
                onChange={(value) => onChangeField(row.id, "internalNotes", value)}
                placeholder="Notes"
                ariaLabel="Indicator notes"
                maxLength={INVENTORY_INDICATOR_INTERNAL_NOTES_MAX}
              />
            )
          default:
            return null
        }
      }}
    />
  )
}
