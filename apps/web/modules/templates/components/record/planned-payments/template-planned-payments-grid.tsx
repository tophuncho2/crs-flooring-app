"use client"

import { ChoiceChipCell, type ChoiceChipOption, MoneyCell, TextCell } from "@/engines/record-view"
import { DataTable, type DataTableColumn } from "@/engines/list-view"
import { CellChip, RecordDeleteButton } from "@/engines/common"
import {
  TEMPLATE_PLANNED_PAYMENT_NOTES_MAX,
  type EntityOption,
  type PaymentPurposeOption,
} from "@builders/domain"
import { EntityTypePicker } from "@/modules/entities/components/picker/entity-type-picker"
import { PaymentPurposePicker } from "@/modules/payment-purposes/components/picker/payment-purpose-picker"
import type { TemplatePlannedPaymentLocal } from "@/modules/templates/controllers/record/planned-payments/use-template-planned-payments-section"

// Direction options for the toned dropdown chip: Revenue = green (success),
// Expense = red (error). Module-owned (domain-specific labels/tones); the cell
// chrome is the shared engine ChoiceChipCell.
const DIRECTION_OPTIONS: ChoiceChipOption[] = [
  { value: "REVENUE", label: "Revenue", tone: "success" },
  { value: "EXPENSE", label: "Expense", tone: "error" },
]

const TEMPLATE_PLANNED_PAYMENTS_COLUMNS: DataTableColumn<TemplatePlannedPaymentLocal>[] = [
  // Entity link leads; Type is a read-only lookup off the picked entity.
  { key: "entity", label: "Entity", width: 220 },
  { key: "types", label: "Type", width: 200 },
  { key: "purpose", label: "Purpose", width: 200 },
  { key: "amount", label: "Amount", width: 160, align: "end" },
  // Direction sits to the RIGHT of amount and carries the tone chip/badge.
  { key: "direction", label: "Direction", width: 160 },
  { key: "notes", label: "Notes", width: 320 },
]

// Pure editable-table body for the Planned Payments §3 section. The RecordItemSection
// chrome lives in the section host. Amount is a plain MoneyCell (no chip); the
// Direction cell is a dropdown that renders the green/red tone badge.
export function TemplatePlannedPaymentsGrid({
  items,
  editable,
  onChangeField,
  onSelectEntity,
  onSelectPaymentPurpose,
  onRemoveItem,
}: {
  items: TemplatePlannedPaymentLocal[]
  editable: boolean
  onChangeField: (itemId: string, field: keyof TemplatePlannedPaymentLocal, value: string) => void
  onSelectEntity: (itemId: string, option: EntityOption | null) => void
  onSelectPaymentPurpose: (itemId: string, option: PaymentPurposeOption | null) => void
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
                maxLength={TEMPLATE_PLANNED_PAYMENT_NOTES_MAX}
              />
            )
          default:
            return null
        }
      }}
    />
  )
}
