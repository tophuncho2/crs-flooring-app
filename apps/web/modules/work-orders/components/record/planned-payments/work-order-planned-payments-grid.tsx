"use client"

import { Banknote } from "lucide-react"
import { ChoiceChipCell, type ChoiceChipOption, MoneyCell, TextCell } from "@/engines/record-view"
import { DataTable, type DataTableColumn } from "@/engines/list-view"
import { CellChip, RecordDeleteButton, RecordOptionsMenu } from "@/engines/common"
import {
  WORK_ORDER_PLANNED_PAYMENT_NOTES_MAX,
  type EntityOption,
  type PaymentPurposeOption,
} from "@builders/domain"
import { EntityTypePicker } from "@/modules/entities/components/picker/entity-type-picker"
import { PaymentPurposePicker } from "@/modules/payment-purposes/components/picker/payment-purpose-picker"
import type { WorkOrderPlannedPaymentLocal } from "@/modules/work-orders/controllers/record/planned-payments/use-work-order-planned-payments-section"

// Direction options for the toned dropdown chip: Revenue = green (success),
// Expense = red (error). Module-owned (domain-specific labels/tones); the cell
// chrome is the shared engine ChoiceChipCell.
const DIRECTION_OPTIONS: ChoiceChipOption[] = [
  { value: "REVENUE", label: "Revenue", tone: "success" },
  { value: "EXPENSE", label: "Expense", tone: "error" },
]

const WORK_ORDER_PLANNED_PAYMENTS_COLUMNS: DataTableColumn<WorkOrderPlannedPaymentLocal>[] = [
  // Amount leads; Direction sits to its RIGHT and carries the tone chip/badge.
  { key: "amount", label: "Amount", width: 160, align: "end" },
  { key: "direction", label: "Direction", width: 160 },
  { key: "purpose", label: "Purpose", width: 200 },
  // Entity link, then Type (a read-only lookup off the picked entity).
  { key: "entity", label: "Entity", width: 220 },
  { key: "types", label: "Type", width: 200 },
  { key: "notes", label: "Notes", width: 320 },
]

// Pure editable-table body for the Planned Payments section. The RecordItemSection
// chrome lives in the section host. Amount is a plain MoneyCell (no chip); the
// Direction cell is a dropdown that renders the green/red tone badge.
export function WorkOrderPlannedPaymentsGrid({
  items,
  editable,
  onChangeField,
  onSelectEntity,
  onSelectPaymentPurpose,
  onRemoveItem,
  onCreatePayment,
}: {
  items: WorkOrderPlannedPaymentLocal[]
  editable: boolean
  onChangeField: (itemId: string, field: keyof WorkOrderPlannedPaymentLocal, value: string) => void
  onSelectEntity: (itemId: string, option: EntityOption | null) => void
  onSelectPaymentPurpose: (itemId: string, option: PaymentPurposeOption | null) => void
  onRemoveItem: (itemId: string) => void
  // Row ⋮ "Create payment" — opens a payment-create modal seeded from this row.
  onCreatePayment: (item: WorkOrderPlannedPaymentLocal) => void
}) {
  return (
    <DataTable<WorkOrderPlannedPaymentLocal>
      variant="editable"
      flush
      rows={items}
      columns={WORK_ORDER_PLANNED_PAYMENTS_COLUMNS}
      empty="No planned payments yet."
      // Two gutter controls (delete + ⋮ options) → widen past the 44px default.
      rowActionsWidth={72}
      rowActions={(item) => (
        <>
          <RecordDeleteButton
            ariaLabel="Remove planned payment"
            title={editable ? "Remove this planned payment" : "Saving..."}
            disabled={!editable}
            onClick={() => onRemoveItem(item.id)}
          />
          <RecordOptionsMenu
            ariaLabel="Planned payment options"
            items={[
              {
                key: "create-payment",
                label: "Create payment",
                icon: <Banknote size={14} aria-hidden="true" />,
                onClick: () => onCreatePayment(item),
              },
            ]}
          />
        </>
      )}
      renderCell={(column, item) => {
        switch (column.key) {
          case "entity":
            return (
              <EntityTypePicker
                value={item.entityId}
                selectedLabel={item.entityName}
                disabled={!editable}
                onChange={(id) => {
                  // Only the clear path needs handling here — a real pick fires
                  // onOptionSelected with the full option. Snapshotting id+name+
                  // types together keeps selectedLabel from ever desyncing.
                  if (id === null) onSelectEntity(item.id, null)
                }}
                onOptionSelected={(option) => onSelectEntity(item.id, option)}
                placeholder="Select entity"
                ariaLabel="Planned payment entity"
                align="left"
              />
            )
          case "types":
            return item.entityType ? (
              <CellChip paletteColor={item.entityType.color}>
                {item.entityType.type}
              </CellChip>
            ) : (
              "—"
            )
          case "purpose":
            return (
              <PaymentPurposePicker
                value={item.paymentPurposeId}
                selectedLabel={item.paymentPurposeName}
                selectedColor={item.paymentPurposeColor}
                disabled={!editable}
                onChange={(id) => {
                  // Only the clear path needs handling — a real pick fires
                  // onOptionSelected with the full option. Snapshotting id+name+
                  // color together keeps the chip from ever desyncing.
                  if (id === null) onSelectPaymentPurpose(item.id, null)
                }}
                onOptionSelected={(option) => onSelectPaymentPurpose(item.id, option)}
                placeholder="Select purpose"
                ariaLabel="Planned payment purpose"
              />
            )
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
          case "notes":
            return (
              <TextCell
                editable={editable}
                value={item.notes}
                onChange={(next) => onChangeField(item.id, "notes", next)}
                placeholder="Notes"
                ariaLabel="Planned payment notes"
                maxLength={WORK_ORDER_PLANNED_PAYMENT_NOTES_MAX}
              />
            )
          default:
            return null
        }
      }}
    />
  )
}
