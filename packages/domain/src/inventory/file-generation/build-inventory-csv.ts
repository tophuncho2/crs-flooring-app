import { toCsv, type ExportColumn } from "../../shared/csv.js"
import type { InventoryDetail } from "../types.js"
import {
  INVENTORY_PRINT_ADJUSTMENT_COLUMNS,
  INVENTORY_PRINT_FIELD_COLUMNS,
  type InventoryPrintConfig,
} from "./types.js"

/**
 * The checkbox-driven inventory CSV export — the CSV sibling of
 * {@link import("./build-inventory-print-html.js").buildInventoryPrintHtml}. Unlike
 * the print (record only), the CSV also carries the adjustments ledger — the CSV is
 * the sole home for adjustments (they never fit a printed sheet). Given the same
 * {@link InventoryDetail} + {@link InventoryPrintConfig} the configurator drives the
 * preview with, it emits stacked blocks:
 *
 *   1. the inventory record — one `Field,Value` row per CHECKED inventory field, then
 *   2. the adjustments table — the checked adjustment columns × the selected rows.
 *      Appended whenever at least one adjustment column is checked AND at least one
 *      row is selected; unticking all columns or picking None rows omits the block.
 *
 * Pure — reuses the shared {@link toCsv} serializer (UTF-8 BOM once, at the file
 * start) and the same manifest `value` fns the print builder uses, so the record
 * block matches the printed sheet.
 */
export function buildInventoryCsv(inventory: InventoryDetail, config: InventoryPrintConfig): string {
  const fieldRows = INVENTORY_PRINT_FIELD_COLUMNS.filter(
    (column) => config.inventoryColumns[column.key],
  ).map((column) => ({ field: column.label, value: column.value(inventory) }))
  // Inventory record block first, BOM on it so Excel decodes the whole file as UTF-8.
  const parts = [toCsv(fieldRows, FIELD_VALUE_COLUMNS, { bom: true })]

  const selected = config.selectedAdjustmentIds ? new Set(config.selectedAdjustmentIds) : null
  const rows = selected
    ? inventory.inventoryAdjustments.filter((row) => selected.has(row.id))
    : inventory.inventoryAdjustments
  const columns = INVENTORY_PRINT_ADJUSTMENT_COLUMNS.filter(
    (column) => config.adjustmentColumns[column.key],
  )
  if (rows.length > 0 && columns.length > 0) {
    parts.push(`Adjustments\r\n${toCsv(rows, columns)}`)
  }

  // Blank line (CRLF + CRLF) between stacked blocks.
  return parts.join("\r\n\r\n")
}

type FieldValueRow = { field: string; value: string }

const FIELD_VALUE_COLUMNS: ReadonlyArray<ExportColumn<FieldValueRow>> = [
  { key: "field", label: "Field", value: (row) => row.field },
  { key: "value", label: "Value", value: (row) => row.value },
]
