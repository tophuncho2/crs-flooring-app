"use client"

import { type ReactNode } from "react"
import { ActionHeader } from "@/components/headers"
import { NumberCell, RowActionButton, TextCell } from "@/components/cells"
import { DuplicateRowButton } from "@/components/features/duplicate-row"
import { Grid, GridEmpty, type GridLayout } from "@/components/grid"
import { CategoryPicker } from "@/modules/categories/components/picker/category-picker"
import { ProductPicker } from "@/modules/products/components/picker/product-picker"
import type { ProductOption } from "@builders/domain"
import type { TemplateMaterialItemLocal } from "@/modules/templates/controllers/use-template-material-items-section"

const TEMPLATE_MATERIAL_ITEMS_LAYOUT: GridLayout<TemplateMaterialItemLocal> = {
  dataColumns: [
    { key: "categoryFilter", label: "Category", minWidth: 160, grow: 0 },
    { key: "product", label: "Product", minWidth: 260, grow: 2 },
    { key: "quantity", label: "Quantity", kind: "number", minWidth: 120, grow: 0, align: "end" },
    { key: "notes", label: "Notes", minWidth: 240, grow: 1.5 },
  ],
  trailingControls: [{ key: "remove", kind: "actions", width: 116 }],
}

export function TemplateMaterialItemsSection({
  items,
  isDirty,
  isSaving,
  hasConflict,
  error,
  noticeMessage,
  noticeError,
  onSave,
  onDiscard,
  onAddItem,
  onDuplicateItem,
  onChangeField,
  onChangeCategoryFilter,
  onSetProductSnapshot,
  onRemoveItem,
}: {
  items: TemplateMaterialItemLocal[]
  isDirty: boolean
  isSaving: boolean
  hasConflict: boolean
  error?: ReactNode
  noticeMessage?: ReactNode
  noticeError?: ReactNode
  onSave: () => void
  onDiscard: () => void
  onAddItem: () => void
  onDuplicateItem: (itemId: string) => void
  onChangeField: (itemId: string, field: keyof TemplateMaterialItemLocal, value: string) => void
  onChangeCategoryFilter: (itemId: string, categoryId: string | null) => void
  onSetProductSnapshot: (itemId: string, option: ProductOption | null) => void
  onRemoveItem: (itemId: string) => void
}) {
  const editable = !isSaving

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
                <CategoryPicker
                  value={item.categoryFilterId}
                  onChange={(next) => onChangeCategoryFilter(item.id, next)}
                  selectedLabel={null}
                  disabled={!editable}
                  placeholder="All categories"
                  ariaLabel="Material item category filter"
                />
              )
            case "product":
              return (
                <ProductPicker
                  value={item.productId || null}
                  onChange={(next) => onChangeField(item.id, "productId", next ?? "")}
                  onOptionSelected={(option) => onSetProductSnapshot(item.id, option)}
                  categoryId={item.categoryFilterId}
                  selectedLabel={item.productName || null}
                  disabled={!editable}
                  placeholder="Select product"
                  ariaLabel="Material item product"
                />
              )
            case "quantity": {
              const unitAbbrev = item.sendUnitAbbrev
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
              <div className="flex items-center gap-1">
                <DuplicateRowButton
                  ariaLabel="Duplicate material item"
                  title={editable ? "Duplicate this material item" : "Saving..."}
                  editable={editable}
                  onClick={() => onDuplicateItem(item.id)}
                />
                <RowActionButton
                  label="✕"
                  ariaLabel="Remove material item"
                  tone="destructive"
                  title={editable ? "Remove this material item" : "Saving..."}
                  editable={editable}
                  onClick={() => onRemoveItem(item.id)}
                />
              </div>
            )
          }
          return null
        }}
      />
    </div>
  )
}
