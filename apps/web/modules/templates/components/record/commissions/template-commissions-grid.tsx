"use client"

import { NumberCell, TextCell } from "@/engines/record-view"
import { DataTable, type DataTableColumn } from "@/engines/list-view"
import { RecordDeleteButton } from "@/engines/common"
import {
  computeTemplateCommissionLineTotal,
  formatMoney,
  TEMPLATE_COMMISSION_NOTES_MAX,
  type EntityOption,
} from "@builders/domain"
import { EntityTypePicker } from "@/modules/entities/components/picker/entity-type-picker"
import type { TemplateCommissionLocal } from "@/modules/templates/controllers/record/products/use-template-products-section"

const TEMPLATE_COMMISSIONS_COLUMNS: DataTableColumn<TemplateCommissionLocal>[] = [
  // Entity (the sales rep) leads. Percent is manual; Line Total is derived
  // (percent × the template's Net Cost).
  { key: "entity", label: "Sales Rep", width: 220 },
  { key: "percent", label: "Percent", width: 120, align: "end" },
  { key: "lineTotal", label: "Line Total", width: 140, align: "end" },
  { key: "notes", label: "Notes", minWidth: 200, grow: 1 },
]

// Pure editable-table body for the commissions side — the THIRD grid in the
// "products" section. The RecordItemSection chrome lives in the section host
// (`TemplateProductsSection`), which mounts this grid beside the planned-products +
// service-items grids under one Save envelope. The entity link is label-only (the
// sales rep); the line total is percent × the shared Net Cost (passed in).
export function TemplateCommissionsGrid({
  items,
  editable,
  netCost,
  onChangeField,
  onSelectEntity,
  onRemoveItem,
}: {
  items: TemplateCommissionLocal[]
  editable: boolean
  // The shared per-unit basis (Σ planned + service line totals) every line total is
  // a percent of. Recomputed live from the sibling grids by the controller.
  netCost: string
  onChangeField: (itemId: string, field: keyof TemplateCommissionLocal, value: string) => void
  onSelectEntity: (itemId: string, option: EntityOption | null) => void
  onRemoveItem: (itemId: string) => void
}) {
  return (
    <DataTable<TemplateCommissionLocal>
      variant="editable"
      rows={items}
      columns={TEMPLATE_COMMISSIONS_COLUMNS}
      empty="No commissions yet."
      rowActions={(item) => (
        <RecordDeleteButton
          ariaLabel="Remove commission"
          title={editable ? "Remove this commission" : "Saving..."}
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
                  // onOptionSelected with the full option. Snapshotting id+name+type
                  // together keeps selectedLabel from ever desyncing.
                  if (id === null) onSelectEntity(item.id, null)
                }}
                onOptionSelected={(option) => onSelectEntity(item.id, option)}
                placeholder="Select sales rep"
                ariaLabel="Commission sales rep"
                align="left"
              />
            )
          case "percent":
            return (
              <NumberCell
                editable={editable}
                value={item.percent}
                onChange={(next) => onChangeField(item.id, "percent", next)}
                placeholder="e.g. 5"
                ariaLabel="Commission percent"
              />
            )
          case "lineTotal": {
            // Derived: percent × Net Cost. Read-only, recomputed live. "—" when the
            // percent is blank.
            const lineTotal = computeTemplateCommissionLineTotal(item.percent, netCost)
            return (
              <NumberCell
                editable={false}
                align="end"
                value={lineTotal ? formatMoney(lineTotal) : "—"}
                ariaLabel="Commission line total"
              />
            )
          }
          case "notes":
            return (
              <TextCell
                editable={editable}
                value={item.notes}
                onChange={(next) => onChangeField(item.id, "notes", next)}
                placeholder="Notes"
                ariaLabel="Commission notes"
                maxLength={TEMPLATE_COMMISSION_NOTES_MAX}
              />
            )
          default:
            return null
        }
      }}
    />
  )
}
