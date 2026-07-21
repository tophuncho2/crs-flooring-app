"use client"

import { MoneyCell, NumberCell, TextCell } from "@/engines/record-view"
import { DataTable, type DataTableColumn } from "@/engines/list-view"
import { RecordDeleteButton } from "@/engines/common"
import { UnitOfMeasurePicker } from "@/modules/unit-of-measures/components/picker/unit-of-measure-picker"
import {
  computeTemplatePlannedProductLineMargin,
  computeTemplatePlannedProductLineProfit,
  computeTemplatePlannedProductLineTotal,
  formatMoney,
  formatSignedMoney,
  type UnitOfMeasureOption,
  TEMPLATE_SERVICE_ITEM_ITEM_NAME_MAX,
  TEMPLATE_SERVICE_ITEM_ITEM_TYPE_MAX,
} from "@builders/domain"
import type { TemplateServiceItemLocal } from "@/modules/templates/controllers/record/products/use-template-products-section"

const TEMPLATE_SERVICE_ITEMS_COLUMNS: DataTableColumn<TemplateServiceItemLocal>[] = [
  // Item Type + Name are free-text; Bid Cost is a MANUAL editable money column
  // (the divergence from planned products, where it's a read-only product join).
  // Unit Price/Tax/Freight are editable money; Line Total/Profit/Margin are derived.
  { key: "itemType", label: "Item Type", minWidth: 160, grow: 1 },
  { key: "itemName", label: "Item Name", minWidth: 200, grow: 1 },
  { key: "quantity", label: "Quantity", width: 120, align: "end" },
  { key: "unit", label: "Unit", width: 130 },
  { key: "bidCost", label: "Bid Cost", width: 120, align: "end" },
  { key: "tax", label: "Tax", width: 110, align: "end" },
  { key: "freight", label: "Freight", width: 110, align: "end" },
  { key: "unitPrice", label: "Unit Price", width: 120, align: "end" },
  { key: "lineTotal", label: "Line Total", width: 120, align: "end" },
  { key: "lineProfit", label: "Line Profit", width: 130, align: "end" },
  { key: "lineMargin", label: "Line Margin", width: 120, align: "end" },
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
            return (
              <TextCell
                editable={editable}
                value={item.itemType}
                onChange={(next) => onChangeField(item.id, "itemType", next)}
                placeholder="Item type"
                ariaLabel="Service item type"
                maxLength={TEMPLATE_SERVICE_ITEM_ITEM_TYPE_MAX}
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
          case "tax":
            return (
              <MoneyCell
                editable={editable}
                value={item.tax}
                onChange={(next) => onChangeField(item.id, "tax", next)}
                ariaLabel="Service item tax"
              />
            )
          case "freight":
            return (
              <MoneyCell
                editable={editable}
                value={item.freight}
                onChange={(next) => onChangeField(item.id, "freight", next)}
                ariaLabel="Service item freight"
              />
            )
          case "unitPrice":
            return (
              <MoneyCell
                editable={editable}
                value={item.unitPrice}
                onChange={(next) => onChangeField(item.id, "unitPrice", next)}
                ariaLabel="Service item unit price"
              />
            )
          case "lineTotal": {
            // Derived: qty × unitPrice + tax + freight (reuses the planned-product
            // line math). Read-only, recomputed live. "—" when all inputs blank.
            const lineTotal = computeTemplatePlannedProductLineTotal({
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              tax: item.tax,
              freight: item.freight,
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
          case "lineProfit": {
            // Derived: Line Total − Line Cost, with the MANUAL bidCost as the cost
            // input. Signed. "—" when qty/price/cost are all blank.
            const profit = computeTemplatePlannedProductLineProfit({
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              bidCost: item.bidCost,
              tax: item.tax,
              freight: item.freight,
            })
            return (
              <NumberCell
                editable={false}
                align="end"
                value={formatSignedMoney(profit) || "—"}
                ariaLabel="Service item line profit"
              />
            )
          }
          case "lineMargin": {
            // Derived: Line Profit ÷ Line Total × 100, one decimal. Read-only.
            // "—" when the line total is blank or zero.
            const margin = computeTemplatePlannedProductLineMargin({
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              bidCost: item.bidCost,
              tax: item.tax,
              freight: item.freight,
            })
            return (
              <NumberCell
                editable={false}
                align="end"
                value={margin ? `${margin}%` : "—"}
                ariaLabel="Service item line margin"
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
