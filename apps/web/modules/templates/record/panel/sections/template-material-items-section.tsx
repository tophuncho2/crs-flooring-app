"use client"

import {
  RecordItemSection,
  RecordMaterialRowBuilder,
  RecordRowStatusBadge,
  RecordSectionGrid,
  RecordSectionGridRow,
  resolveRecordRowStatus,
  type RecordSectionSubHeaderProps,
} from "@/modules/shared/engines/record-view"
import { formatLineTotal } from "@builders/domain"
import { normalizeEditableDecimalInput } from "@/modules/shared/engines/record-view/contracts/child-item-validation"
import {
  hasFieldErrors,
  type RowFieldErrors,
} from "@/modules/shared/engines/record-view/feedback/record-field-errors"
import type {
  EditableMaterialItem,
  MaterialItemField,
  MaterialItemOption,
} from "@/modules/shared/engines/record-view/contracts/material-item-contracts"
import { TEMPLATE_MATERIAL_COLUMNS } from "./template-line-item-grid"
import { buildTemplateMaterialSectionMetrics } from "./template-section-metrics"

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
        {items.map((item, index) => {
          const rowErrors = itemErrors[item.id]
          const status = resolveRecordRowStatus({
            hasErrors: hasFieldErrors(rowErrors),
            isUnsaved: item.id.startsWith("temp:"),
          })

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
                showCellLabels={index === 0}
                onProductChange={(value) => onItemFieldChange(item.id, "productId", value)}
                onQuantityChange={(value) => onItemFieldChange(item.id, "quantity", normalizeEditableDecimalInput(value))}
                onUnitPriceChange={(value) => onItemFieldChange(item.id, "unitPrice", normalizeEditableDecimalInput(value))}
                onNotesChange={(value) => onItemFieldChange(item.id, "notes", value)}
                controls={{
                  capabilities: { supportsStatusColumn: true, supportsRemoveRow: true },
                  status: {
                    content: (
                      <RecordRowStatusBadge tone={status.tone}>
                        {status.label}
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
