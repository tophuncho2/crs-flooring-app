"use client"

import { NumberCell, RecordItemSection, RowActionButton, TextCell } from "@/engines/record-view"
import { Grid, GridEmpty, type GridLayout } from "@/engines/record-view"
import { ProductCategoryPicker } from "@/modules/products/components/picker/product-category-picker"
import { type ProductOption, TEMPLATE_MATERIAL_ITEM_NOTES_MAX } from "@builders/domain"
import type { TemplateMaterialItemLocal } from "@/modules/templates/controllers/record/material-items/use-template-material-items-section"

const TEMPLATE_MATERIAL_ITEMS_LAYOUT: GridLayout<TemplateMaterialItemLocal> = {
  leadingControls: [{ key: "remove", kind: "actions", width: 56 }],
  dataColumns: [
    { key: "product", label: "Product", minWidth: 260, grow: 2 },
    { key: "quantity", label: "Quantity", kind: "number", minWidth: 120, grow: 0, align: "end" },
    { key: "notes", label: "Notes", minWidth: 240, grow: 1.5 },
  ],
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
  onChangeField,
  onChangeCategoryFilter,
  onSetProductSnapshot,
  onRemoveItem,
}: {
  items: TemplateMaterialItemLocal[]
  isDirty: boolean
  isSaving: boolean
  hasConflict: boolean
  error?: string | null
  noticeMessage?: string
  noticeError?: string
  onSave: () => void
  onDiscard: () => void
  onAddItem: () => void
  onChangeField: (itemId: string, field: keyof TemplateMaterialItemLocal, value: string) => void
  onChangeCategoryFilter: (itemId: string, categoryId: string | null) => void
  onSetProductSnapshot: (itemId: string, option: ProductOption | null) => void
  onRemoveItem: (itemId: string) => void
}) {
  const editable = !isSaving

  return (
    <RecordItemSection
      title="Material Items"
      // `item` sections default these off — unlock the managed Save/Discard path
      // and the add action so the toolbar renders the controls that used to live
      // in the ActionHeader.
      capabilities={{ editable: true, supportsSaveDiscard: true, supportsAddRow: true }}
      noticeMessage={noticeMessage}
      noticeError={noticeError}
      subHeader={{
        statusLeading: (
          <span className="inline-flex items-center rounded-xl border border-[rgba(58,58,58,0.72)] bg-[var(--panel-hover)] px-3 py-2 text-sm text-[var(--foreground)]/75">
            {items.length} item{items.length === 1 ? "" : "s"}
          </span>
        ),
        isDirty,
        isSaving,
        hasConflict,
        onSave,
        onDiscard,
        saveLabel: "Save Material Items",
        savingLabel: "Saving Material Items...",
        discardLabel: "Discard",
        error,
        actions: [
          {
            key: "add",
            label: "+ Add Material Item",
            kind: "add-row",
            onClick: onAddItem,
            disabled: isSaving,
          },
        ],
      }}
    >
      <Grid<TemplateMaterialItemLocal>
        rows={items}
        layout={TEMPLATE_MATERIAL_ITEMS_LAYOUT}
        empty={<GridEmpty>No material items yet.</GridEmpty>}
        renderCell={(column, item) => {
          switch (column.key) {
            case "product":
              return (
                <ProductCategoryPicker
                  productId={item.productId || null}
                  productLabel={item.productName || null}
                  onProductChange={(next) => onChangeField(item.id, "productId", next ?? "")}
                  onProductOptionSelected={(option) => onSetProductSnapshot(item.id, option)}
                  categoryId={item.categoryFilterId}
                  onCategoryChange={(next) => onChangeCategoryFilter(item.id, next)}
                  productEditable={editable}
                  categoryEditable={editable}
                  showProductCategory
                  categoryLabel={item.categoryFilterName}
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
                  maxLength={TEMPLATE_MATERIAL_ITEM_NOTES_MAX}
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
    </RecordItemSection>
  )
}
