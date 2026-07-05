"use client"

import { ChoiceChipCell, type ChoiceChipOption, MoneyCell, TextCell } from "@/engines/record-view"
import { DataTable, type DataTableColumn } from "@/engines/list-view"
import { RecordDeleteButton } from "@/engines/common"
import { TEMPLATE_INVOICE_ITEM_NOTES_MAX } from "@builders/domain"
import type { TemplateInvoiceItemLocal } from "@/modules/templates/controllers/record/invoice-items/use-template-invoice-items-section"

// Direction options for the toned dropdown chip: Revenue = green (success),
// Expense = red (error). Module-owned (domain-specific labels/tones); the cell
// chrome is the shared engine ChoiceChipCell. Shared shape with the planned side.
const DIRECTION_OPTIONS: ChoiceChipOption[] = [
  { value: "REVENUE", label: "Revenue", tone: "success" },
  { value: "EXPENSE", label: "Expense", tone: "error" },
]

const TEMPLATE_INVOICE_ITEMS_COLUMNS: DataTableColumn<TemplateInvoiceItemLocal>[] = [
  // Spans mirror the Invoice Products grid so the two sections line up: Notes
  // takes the Product span (wide grow floor), Amount takes the combined
  // Quantity+Cost+Unit span (140+140+150=430), and Direction takes the Notes
  // tail (320) — carrying the tone chip/badge at the right edge.
  { key: "notes", label: "Notes", minWidth: 360, grow: 1 },
  { key: "amount", label: "Amount", width: 430, align: "end" },
  { key: "direction", label: "Direction", width: 320 },
]

// Pure editable-table body for the Invoice Items §3 section — a smaller mirror
// of the planned grid: amount · direction · notes only (no Entity/Type(s)/Date).
// The RecordItemSection chrome lives in the section host.
export function TemplateInvoiceItemsGrid({
  items,
  editable,
  onChangeField,
  onRemoveItem,
}: {
  items: TemplateInvoiceItemLocal[]
  editable: boolean
  onChangeField: (itemId: string, field: keyof TemplateInvoiceItemLocal, value: string) => void
  onRemoveItem: (itemId: string) => void
}) {
  return (
    <DataTable<TemplateInvoiceItemLocal>
      variant="editable"
      rows={items}
      columns={TEMPLATE_INVOICE_ITEMS_COLUMNS}
      empty="No invoice items yet."
      rowActions={(item) => (
        <RecordDeleteButton
          ariaLabel="Remove invoice item"
          title={editable ? "Remove this invoice item" : "Saving..."}
          disabled={!editable}
          onClick={() => onRemoveItem(item.id)}
        />
      )}
      renderCell={(column, item) => {
        switch (column.key) {
          case "amount":
            return (
              <MoneyCell
                editable={editable}
                value={item.amount}
                onChange={(next) => onChangeField(item.id, "amount", next)}
                ariaLabel="Invoice item amount"
              />
            )
          case "direction":
            return (
              <ChoiceChipCell
                editable={editable}
                value={item.direction}
                options={DIRECTION_OPTIONS}
                onChange={(next) => onChangeField(item.id, "direction", next)}
                ariaLabel="Invoice item direction"
              />
            )
          case "notes":
            return (
              <TextCell
                editable={editable}
                value={item.notes}
                onChange={(next) => onChangeField(item.id, "notes", next)}
                placeholder="Notes"
                ariaLabel="Invoice item notes"
                maxLength={TEMPLATE_INVOICE_ITEM_NOTES_MAX}
              />
            )
          default:
            return null
        }
      }}
    />
  )
}
