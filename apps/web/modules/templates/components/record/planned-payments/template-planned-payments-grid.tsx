"use client"

import { ChoiceChipCell, type ChoiceChipOption, DateCell, MoneyCell } from "@/engines/record-view"
import { DataTable, type DataTableColumn } from "@/engines/list-view"
import { RecordDeleteButton } from "@/engines/common"
import type { TemplatePlannedPaymentLocal } from "@/modules/templates/controllers/record/planned-payments/use-template-planned-payments-section"

// Direction options for the toned dropdown chip: Revenue = green (success),
// Expense = red (error). Module-owned (domain-specific labels/tones); the cell
// chrome is the shared engine ChoiceChipCell.
const DIRECTION_OPTIONS: ChoiceChipOption[] = [
  { value: "REVENUE", label: "Revenue", tone: "success" },
  { value: "EXPENSE", label: "Expense", tone: "error" },
]

const TEMPLATE_PLANNED_PAYMENTS_COLUMNS: DataTableColumn<TemplatePlannedPaymentLocal>[] = [
  { key: "amount", label: "Amount", width: 160, align: "end" },
  // Direction sits to the RIGHT of amount and carries the tone chip/badge.
  { key: "direction", label: "Direction", width: 160 },
  { key: "paymentDate", label: "Date", width: 170 },
]

// Pure editable-table body for the Planned Payments §3 section. The RecordItemSection
// chrome lives in the section host. Amount is a plain MoneyCell (no chip); the
// Direction cell is a dropdown that renders the green/red tone badge.
export function TemplatePlannedPaymentsGrid({
  items,
  editable,
  onChangeField,
  onRemoveItem,
}: {
  items: TemplatePlannedPaymentLocal[]
  editable: boolean
  onChangeField: (itemId: string, field: keyof TemplatePlannedPaymentLocal, value: string) => void
  onRemoveItem: (itemId: string) => void
}) {
  return (
    <DataTable<TemplatePlannedPaymentLocal>
      variant="editable"
      rows={items}
      columns={TEMPLATE_PLANNED_PAYMENTS_COLUMNS}
      empty="No planned payments yet."
      rowActions={(item) => (
        <RecordDeleteButton
          ariaLabel="Remove planned payment"
          title={editable ? "Remove this planned payment" : "Saving..."}
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
                ariaLabel="Planned payment amount"
              />
            )
          case "direction":
            return (
              <ChoiceChipCell
                editable={editable}
                value={item.direction}
                options={DIRECTION_OPTIONS}
                onChange={(next) => onChangeField(item.id, "direction", next)}
                ariaLabel="Planned payment direction"
              />
            )
          case "paymentDate":
            return (
              <DateCell
                editable={editable}
                value={item.paymentDate}
                onChange={(next) => onChangeField(item.id, "paymentDate", next)}
                ariaLabel="Planned payment date"
              />
            )
          default:
            return null
        }
      }}
    />
  )
}
