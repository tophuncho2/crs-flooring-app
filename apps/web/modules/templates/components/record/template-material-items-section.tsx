"use client"

import { useMemo, type ReactNode } from "react"
import { ActionHeader } from "@/components/headers"
import { DropdownCell, NumberCell, RowActionButton, TextCell } from "@/components/cells"
import { Grid, GridEmpty, type GridLayout } from "@/components/grid"
import type { TemplateMaterialItemLocal } from "@/modules/templates/controllers/use-template-material-items-section"

const TEMPLATE_MATERIAL_ITEMS_LAYOUT: GridLayout<TemplateMaterialItemLocal> = {
  dataColumns: [
    { key: "categoryFilter", label: "Category", minWidth: 160, grow: 0 },
    { key: "product", label: "Product", minWidth: 260, grow: 2 },
    { key: "quantity", label: "Quantity", kind: "number", minWidth: 120, grow: 0, align: "end" },
    { key: "notes", label: "Notes", minWidth: 240, grow: 1.5 },
  ],
  trailingControls: [{ key: "remove", kind: "actions", width: 72 }],
}

export type MaterialItemProductOption = {
  id: string
  name: string
  categoryId: string
  // Send-unit snapshot from the product. Surfaced beside the quantity input so
  // the user sees the unit (e.g., "sf") inline as soon as a product is picked.
  sendUnitName: string
  sendUnitAbbrev: string
}
export type TemplateMaterialItemCategoryOption = { id: string; name: string }

export function TemplateMaterialItemsSection({
  items,
  productOptions,
  categoryOptions,
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
  onChangeCategoryFilter,
  onRemoveItem,
}: {
  items: TemplateMaterialItemLocal[]
  productOptions: MaterialItemProductOption[]
  categoryOptions: TemplateMaterialItemCategoryOption[]
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
  onChangeCategoryFilter: (itemId: string, categoryId: string | null) => void
  onRemoveItem: (itemId: string) => void
}) {
  const editable = !isSaving
  const categoryCellOptions = categoryOptions.map((option) => ({ id: option.id, label: option.name }))
  // Lookup map for the quantity-cell unit suffix. Built once per render —
  // cheap; productOptions is the warehouse-scoped picker list (~hundreds at
  // most). Avoids an O(n*m) scan across the grid rows.
  const productById = useMemo(() => {
    const map = new Map<string, MaterialItemProductOption>()
    for (const product of productOptions) map.set(product.id, product)
    return map
  }, [productOptions])

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
            case "categoryFilter":
              return (
                <DropdownCell
                  editable={editable}
                  value={item.categoryFilterId}
                  onChange={(next) => onChangeCategoryFilter(item.id, next)}
                  options={categoryCellOptions}
                  allowClear
                  placeholder="All categories"
                  ariaLabel="Material item category filter"
                />
              )
            case "product": {
              // Filter by category. Always include the currently-selected
              // product so the user's pick survives a filter change. Mirrors
              // imports staged-rows category→product cascade.
              const visibleProducts = item.categoryFilterId
                ? productOptions.filter(
                    (p) => p.categoryId === item.categoryFilterId || p.id === item.productId,
                  )
                : productOptions
              return (
                <DropdownCell
                  editable={editable}
                  value={item.productId || null}
                  onChange={(next) => onChangeField(item.id, "productId", next ?? "")}
                  options={visibleProducts.map((option) => ({ id: option.id, label: option.name }))}
                  placeholder="Select product"
                  ariaLabel="Material item product"
                />
              )
            }
            case "quantity": {
              const unitAbbrev = productById.get(item.productId)?.sendUnitAbbrev ?? ""
              return (
                <div className="flex w-full items-center gap-2">
                  <div className="min-w-0 flex-1">
                    <NumberCell
                      editable={editable}
                      value={item.quantity}
                      onChange={(next) => onChangeField(item.id, "quantity", next)}
                      placeholder="Quantity"
                      ariaLabel="Material item quantity"
                    />
                  </div>
                  <span className="shrink-0 text-[var(--foreground)]/60" aria-hidden="true">
                    {unitAbbrev || "—"}
                  </span>
                </div>
              )
            }
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
