"use client"

import {
  RecordItemSection,
  RecordMaterialRowBuilder,
  RecordRowStatusBadge,
  RecordSectionGrid,
  RecordSectionGridRow,
  type RecordSectionSubHeaderProps,
} from "@/features/shared/engines/record-view"
import { formatLineTotal } from "@/features/flooring/shared/line-items/line-totals"
import { normalizeEditableDecimalInput } from "@/features/flooring/shared/line-items/child-item-validation"
import {
  hasFieldErrors,
  type RowFieldErrors,
} from "@/features/flooring/shared/line-items/record-field-errors"
import type {
  EditableMaterialItem,
  MaterialItemField,
  MaterialItemOption,
} from "@/features/flooring/shared/line-items/material-items-editor"
import { TEMPLATE_MATERIAL_COLUMNS } from "./template-line-item-grid"
import { buildTemplateMaterialSectionMetrics } from "./template-section-metrics"

function readStatusLabel(item: EditableMaterialItem, hasErrors: boolean) {
  if (hasErrors) {
    return "Needs Review"
  }

  if (item.id.startsWith("temp:")) {
    return "Unsaved"
  }

  return "Ready"
}

function readStatusTone(item: EditableMaterialItem, hasErrors: boolean) {
  if (hasErrors) return "error" as const
  if (item.id.startsWith("temp:")) return "warning" as const
  return "neutral" as const
}

export function TemplateMaterialItemsSection({
  title,
  items,
  productOptions,
  loading,
  subHeader,
  noticeMessage,
  noticeError,
  itemErrors = {},
  totalAmount,
  onItemFieldChange,
  onDeleteItem,
}: {
  title: string
  items: EditableMaterialItem[]
  productOptions: MaterialItemOption[]
  loading: boolean
  subHeader?: Omit<RecordSectionSubHeaderProps, "sectionType" | "capabilities">
  noticeMessage?: string
  noticeError?: string
  itemErrors?: RowFieldErrors<MaterialItemField>
  totalAmount?: number
  onItemFieldChange: (itemId: string, field: keyof EditableMaterialItem, value: string) => void
  onDeleteItem: (itemId: string) => void
}) {
  const metrics = buildTemplateMaterialSectionMetrics(items, totalAmount)

  return (
    <RecordItemSection
      title={title}
      bodyClassName="space-y-0"
      subHeader={subHeader}
      noticeMessage={noticeMessage}
      noticeError={noticeError}
      metrics={metrics}
      capabilities={{
        editable: true,
        supportsAddRow: true,
        supportsRemoveRow: true,
        supportsStatusColumn: true,
        supportsSaveDiscard: true,
        supportsMetrics: true,
        supportsSummary: true,
        supportsEmptyState: false,
      }}
      loading={loading}
      loadingState={<div className="border px-4 py-8 text-center text-[var(--foreground)]/70">Loading items...</div>}
      isEmpty={false}
    >
      <RecordSectionGrid
        columns={TEMPLATE_MATERIAL_COLUMNS}
        isEmpty={items.length === 0}
        emptyState="No material items yet."
      >
        {items.map((item) => {
          const rowErrors = itemErrors[item.id]
          const hasErrors = hasFieldErrors(rowErrors)

          return (
            <RecordSectionGridRow key={item.id} columns={TEMPLATE_MATERIAL_COLUMNS}>
              <RecordMaterialRowBuilder
                productValue={item.productId}
                productOptions={productOptions.map((product) => ({
                  value: product.id,
                  label: product.label,
                }))}
                productPlaceholderLabel="Select product"
                quantityValue={item.quantity}
                unitLabel={item.sendUnit || "-"}
                unitPriceValue={item.unitPrice}
                unitPriceUnit={item.sendUnit || "unit"}
                totalValue={formatLineTotal(item)}
                notesValue={item.notes}
                productError={rowErrors?.productId}
                quantityError={rowErrors?.quantity}
                unitPriceError={rowErrors?.unitPrice}
                onProductChange={(value) => onItemFieldChange(item.id, "productId", value)}
                onQuantityChange={(value) => onItemFieldChange(item.id, "quantity", normalizeEditableDecimalInput(value))}
                onUnitPriceChange={(value) => onItemFieldChange(item.id, "unitPrice", normalizeEditableDecimalInput(value))}
                onNotesChange={(value) => onItemFieldChange(item.id, "notes", value)}
                controls={{
                  capabilities: { supportsStatusColumn: true, supportsRemoveRow: true },
                  status: {
                    content: (
                      <RecordRowStatusBadge tone={readStatusTone(item, hasErrors)}>
                        {readStatusLabel(item, hasErrors)}
                      </RecordRowStatusBadge>
                    ),
                  },
                  remove: {
                    onRemove: () => onDeleteItem(item.id),
                  },
                }}
              />
            </RecordSectionGridRow>
          )
        })}
      </RecordSectionGrid>
    </RecordItemSection>
  )
}
