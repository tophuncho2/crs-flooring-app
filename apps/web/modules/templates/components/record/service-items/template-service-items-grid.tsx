"use client"

import { DropdownCell, MoneyCell, NumberCell, TextCell } from "@/engines/record-view"
import { DataTable, type DataTableColumn } from "@/engines/list-view"
import { RecordDeleteButton } from "@/engines/common"
import { UnitOfMeasurePicker } from "@/modules/unit-of-measures/components/picker/unit-of-measure-picker"
import {
  computeTemplatePlannedProductLineTotal,
  formatMoney,
  type UnitOfMeasureOption,
  TEMPLATE_SERVICE_ITEM_ITEM_NAME_MAX,
} from "@builders/domain"
import type { TemplateServiceItemLocal } from "@/modules/templates/controllers/record/products/use-template-products-section"
import { SERVICE_ITEM_TYPE_OPTIONS } from "./service-item-type-options"

const TEMPLATE_SERVICE_ITEMS_COLUMNS: DataTableColumn<TemplateServiceItemLocal>[] = [
  // Item Type + Name are free-text; Bid Cost is a MANUAL editable money column
  // (the divergence from planned products, where it's a read-only product join) and
  // the per-unit basis for Line Total; Line Total is derived.
  { key: "itemType", label: "Item Type", minWidth: 160, grow: 1 },
  { key: "itemName", label: "Item Name", minWidth: 200, grow: 1 },
  { key: "quantity", label: "Quantity", width: 120, align: "end" },
  { key: "unit", label: "Unit", width: 130 },
  { key: "bidCost", label: "Bid Cost", width: 120, align: "end" },
  { key: "lineTotal", label: "Line Total", width: 120, align: "end" },
]

// Pure editable-table body for the service / misc items side. The
// RecordItemSection chrome lives in the shared host (`TemplateProductsSection`),
// which mounts this grid beside the planned-products grid under one Save envelope.
export function TemplateServiceItemsGrid({
  items,
  editable,
  onChangeField,
  onChangeQuantity,
  onSetUnit,
  onRemoveItem,
}: {
  items: TemplateServiceItemLocal[]
  editable: boolean
  onChangeField: (itemId: string, field: keyof TemplateServiceItemLocal, value: string) => void
  onChangeQuantity: (itemId: string, value: string) => void
  onSetUnit: (itemId: string, option: UnitOfMeasureOption | null) => void
  onRemoveItem: (itemId: string) => void
}) {
  return (
    <DataTable<TemplateServiceItemLocal>
      variant="editable"
      rows={items}
      columns={TEMPLATE_SERVICE_ITEMS_COLUMNS}
      empty="No service or misc items yet."
      rowActions={(item) => (
        <RecordDeleteButton
          ariaLabel="Remove service item"
          title={editable ? "Remove this service item" : "Saving..."}
          disabled={!editable}
          onClick={() => onRemoveItem(item.id)}
        />
      )}
      renderCell={(column, item) => {
        switch (column.key) {
          case "itemType":
            // Required enum — a Labor / Miscellaneous dropdown (no free text, no
            // clear). New rows seed the default in the controller.
            return (
              <DropdownCell
                editable={editable}
                value={item.itemType}
                options={SERVICE_ITEM_TYPE_OPTIONS}
                onChange={(next) => onChangeField(item.id, "itemType", next ?? "")}
                ariaLabel="Service item type"
              />
            )
          case "itemName":
            return (
              <TextCell
                editable={editable}
                value={item.itemName}
                onChange={(next) => onChangeField(item.id, "itemName", next)}
                placeholder="Item name"
                ariaLabel="Service item name"
                maxLength={TEMPLATE_SERVICE_ITEM_ITEM_NAME_MAX}
              />
            )
          case "quantity":
            return (
              <NumberCell
                editable={editable}
                value={item.quantity}
                onChange={(next) => onChangeQuantity(item.id, next)}
                placeholder="Quantity"
                ariaLabel="Service item quantity"
              />
            )
          case "unit":
            return (
              <UnitOfMeasurePicker
                value={item.unitId || null}
                selectedLabel={item.unitName || null}
                onChange={(id) => onChangeField(item.id, "unitId", id ?? "")}
                onOptionSelected={(option) => onSetUnit(item.id, option)}
                disabled={!editable}
                ariaLabel="Service item unit"
              />
            )
          case "bidCost":
            // Manual bid cost — an EDITABLE money column here (the divergence from
            // planned products, where it's a read-only live product-cost join).
            return (
              <MoneyCell
                editable={editable}
                value={item.bidCost}
                onChange={(next) => onChangeField(item.id, "bidCost", next)}
                ariaLabel="Service item bid cost"
              />
            )
          case "lineTotal": {
            // Derived: qty × bidCost, using the manual bid cost (reuses the
            // planned-product line math). Read-only, recomputed live. "—" when all
            // inputs blank.
            const lineTotal = computeTemplatePlannedProductLineTotal({
              quantity: item.quantity,
              bidCost: item.bidCost,
            })
            return (
              <NumberCell
                editable={false}
                align="end"
                value={lineTotal ? formatMoney(lineTotal) : "—"}
                ariaLabel="Service item line total"
              />
            )
          }
          default:
            return null
        }
      }}
    />
  )
}
