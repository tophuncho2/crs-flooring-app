"use client"

import {
  RECORD_FIELD_CONTROL_CLASS_NAME,
  RecordGridCellInput,
  RecordItemCell,
  RecordItemSection,
  RecordItemSectionControls,
  RecordSectionGrid,
  RecordSectionGridRow,
  type RecordRowColumnSpec,
  type RecordSectionSubHeaderProps,
} from "@/modules/shared/engines/record-view"
import type { TemplateMaterialItemLocal } from "@/modules/templates/controllers/use-template-material-items-section"

const MATERIAL_ITEM_COLUMNS: RecordRowColumnSpec[] = [
  { key: "product", minWidth: 260, grow: 2, label: "Product" },
  { key: "quantity", minWidth: 120, grow: 0, align: "center", label: "Quantity" },
  { key: "unitPrice", minWidth: 120, grow: 0, align: "center", label: "Unit Price" },
  { key: "notes", minWidth: 240, grow: 2, label: "Notes" },
  { key: "controls", minWidth: 96, grow: 0, align: "center", label: "Actions" },
]

export type MaterialItemProductOption = { id: string; name: string }

export function TemplateMaterialItemsSection({
  items,
  productOptions,
  subHeader,
  noticeMessage,
  noticeError,
  onChangeField,
  onRemoveItem,
}: {
  items: TemplateMaterialItemLocal[]
  productOptions: MaterialItemProductOption[]
  subHeader?: Omit<RecordSectionSubHeaderProps, "sectionType" | "capabilities">
  noticeMessage?: string
  noticeError?: string
  onChangeField: (itemId: string, field: keyof TemplateMaterialItemLocal, value: string) => void
  onRemoveItem: (itemId: string) => void
}) {
  return (
    <RecordItemSection
      title="Material Items"
      bodyClassName="space-y-0"
      subHeader={subHeader}
      noticeMessage={noticeMessage}
      noticeError={noticeError}
      metrics={[{ label: "Items", value: String(items.length) }]}
      capabilities={{
        supportsMetrics: true,
        supportsSummary: true,
        supportsEmptyState: true,
        supportsScopedRows: true,
        supportsSaveDiscard: true,
        supportsAddRow: true,
        supportsRemoveRow: true,
        editable: true,
      }}
      isEmpty={items.length === 0}
      emptyState="No material items yet."
    >
      <RecordSectionGrid
        columns={MATERIAL_ITEM_COLUMNS}
        isEmpty={items.length === 0}
        emptyState="No material items yet."
      >
        {items.map((item, index) => (
          <RecordSectionGridRow key={item.id} columns={MATERIAL_ITEM_COLUMNS}>
            <RecordItemCell columnKey="product" chrome="grid" showLabel={index === 0}>
              <select
                value={item.productId}
                onChange={(event) => onChangeField(item.id, "productId", event.target.value)}
                disabled={subHeader?.isSaving}
                className={RECORD_FIELD_CONTROL_CLASS_NAME}
              >
                <option value="">Select product</option>
                {productOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.name}
                  </option>
                ))}
              </select>
            </RecordItemCell>
            <RecordItemCell columnKey="quantity" chrome="grid" density="compact" showLabel={index === 0}>
              <RecordGridCellInput
                type="number"
                value={item.quantity}
                onChange={(event) => onChangeField(item.id, "quantity", event.target.value)}
                placeholder="Quantity"
                controlSize="compact"
              />
            </RecordItemCell>
            <RecordItemCell columnKey="unitPrice" chrome="grid" density="compact" showLabel={index === 0}>
              <RecordGridCellInput
                type="number"
                value={item.unitPrice}
                onChange={(event) => onChangeField(item.id, "unitPrice", event.target.value)}
                placeholder="Unit price"
                controlSize="compact"
              />
            </RecordItemCell>
            <RecordItemCell columnKey="notes" chrome="grid" density="compact" showLabel={index === 0}>
              <RecordGridCellInput
                value={item.notes}
                onChange={(event) => onChangeField(item.id, "notes", event.target.value)}
                placeholder="Notes"
                controlSize="compact"
              />
            </RecordItemCell>
            <RecordItemSectionControls
              capabilities={{ supportsRemoveRow: true }}
              cellChrome="grid"
              showCellLabels={index === 0}
              remove={{
                onRemove: () => onRemoveItem(item.id),
                disabled: subHeader?.isSaving,
              }}
            />
          </RecordSectionGridRow>
        ))}
      </RecordSectionGrid>
    </RecordItemSection>
  )
}
