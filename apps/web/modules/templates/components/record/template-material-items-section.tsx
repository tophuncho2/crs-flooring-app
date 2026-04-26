"use client"

import type { ReactNode } from "react"
import { ActionHeader } from "@/components/headers"
import { CurrencyCell, DropdownCell, NumberCell, RowActionButton, TextCell } from "@/components/cells"
import { Grid, GridEmpty, type GridLayout } from "@/components/grid"
import type { TemplateMaterialItemLocal } from "@/modules/templates/controllers/use-template-material-items-section"

const TEMPLATE_MATERIAL_ITEMS_LAYOUT: GridLayout<TemplateMaterialItemLocal> = {
  dataColumns: [
    { key: "product", label: "Product", minWidth: 260, grow: 2 },
    { key: "quantity", label: "Quantity", kind: "number", minWidth: 120, grow: 0, align: "end" },
    { key: "unitPrice", label: "Unit Price", kind: "currency", minWidth: 120, grow: 0, align: "end" },
    { key: "notes", label: "Notes", minWidth: 240, grow: 1.5 },
  ],
  trailingControls: [{ key: "remove", kind: "actions", width: 72 }],
}

export type MaterialItemProductOption = { id: string; name: string }

export function TemplateMaterialItemsSection({
  items,
  productOptions,
  isDirty,
  isSaving,
  hasConflict,
  error,
  noticeMessage,
  noticeError,
  onSave,
  onDiscard,
  onAddItem,
  onChangeField,
  onRemoveItem,
}: {
  items: TemplateMaterialItemLocal[]
  productOptions: MaterialItemProductOption[]
  isDirty: boolean
  isSaving: boolean
  hasConflict: boolean
  error?: ReactNode
  noticeMessage?: ReactNode
  noticeError?: ReactNode
  onSave: () => void
  onDiscard: () => void
  onAddItem: () => void
  onChangeField: (itemId: string, field: keyof TemplateMaterialItemLocal, value: string) => void
  onRemoveItem: (itemId: string) => void
}) {
  const editable = !isSaving
  const productCellOptions = productOptions.map((option) => ({ id: option.id, label: option.name }))

  return (
    <div className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel-background)]">
      <ActionHeader
        title="Material Items"
        summary={
          <span>
            {items.length} item{items.length === 1 ? "" : "s"}
          </span>
        }
        actions={[
          {
            key: "add",
            label: "+ Add Material Item",
            onClick: onAddItem,
            kind: "secondary",
            disabled: isSaving,
          },
          {
            key: "discard",
            label: "Discard",
            onClick: onDiscard,
            kind: "secondary",
            disabled: !isDirty || isSaving,
          },
          {
            key: "save",
            label: isSaving ? "Saving Material Items..." : "Save Material Items",
            onClick: onSave,
            kind: "primary",
            disabled: !isDirty || isSaving || hasConflict,
          },
        ]}
        message={noticeMessage}
        error={error ?? noticeError}
      />

      <Grid<TemplateMaterialItemLocal>
        rows={items}
        layout={TEMPLATE_MATERIAL_ITEMS_LAYOUT}
        empty={<GridEmpty>No material items yet.</GridEmpty>}
        renderCell={(column, item) => {
          switch (column.key) {
            case "product":
              return (
                <DropdownCell
                  editable={editable}
                  value={item.productId || null}
                  onChange={(next) => onChangeField(item.id, "productId", next ?? "")}
                  options={productCellOptions}
                  placeholder="Select product"
                  ariaLabel="Material item product"
                />
              )
            case "quantity":
              return (
                <NumberCell
                  editable={editable}
                  value={item.quantity}
                  onChange={(next) => onChangeField(item.id, "quantity", next)}
                  placeholder="Quantity"
                  ariaLabel="Material item quantity"
                />
              )
            case "unitPrice":
              return (
                <CurrencyCell
                  editable={editable}
                  value={item.unitPrice}
                  onChange={(next) => onChangeField(item.id, "unitPrice", next)}
                  placeholder="Unit price"
                  ariaLabel="Material item unit price"
                />
              )
            case "notes":
              return (
                <TextCell
                  editable={editable}
                  value={item.notes}
                  onChange={(next) => onChangeField(item.id, "notes", next)}
                  placeholder="Notes"
                  ariaLabel="Material item notes"
                />
              )
            default:
              return null
          }
        }}
        renderControl={(control, item) => {
          if (control.kind === "actions") {
            return (
              <RowActionButton
                label="✕"
                ariaLabel="Remove material item"
                tone="destructive"
                title={editable ? "Remove this material item" : "Saving..."}
                editable={editable}
                onClick={() => onRemoveItem(item.id)}
              />
            )
          }
          return null
        }}
      />
    </div>
  )
}
