"use client"

import type { ReactNode } from "react"
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
import { WORK_ORDER_MATERIAL_COLUMNS } from "./work-order-line-item-grid"
import { buildMaterialSectionMetrics } from "./work-order-section-metrics"
import type { WorkOrderMaterialItem } from "@/features/flooring/work-orders/types"

function readProductLabel(options: MaterialItemOption[], productId: string, fallback: string) {
  return options.find((product) => product.id === productId)?.label || fallback || "Untitled Material"
}

function readProductUnit(options: MaterialItemOption[], productId: string, fallback: string) {
  return options.find((product) => product.id === productId)?.sendUnit || fallback || "-"
}

function readMaterialRowStatus(item: WorkOrderMaterialItem, hasErrors: boolean) {
  if (hasErrors) {
    return "Needs Review"
  }

  if (item.id.startsWith("temp:")) {
    return "Unsaved"
  }

  return item.allocationStatus.replaceAll("_", " ")
}

function readMaterialRowStatusTone(item: WorkOrderMaterialItem, hasErrors: boolean) {
  if (hasErrors) {
    return "error" as const
  }

  if (item.id.startsWith("temp:")) {
    return "warning" as const
  }

  if (item.allocationStatus === "FULLY_ALLOCATED") {
    return "success" as const
  }

  if (item.allocationStatus === "SHORTAGE") {
    return "error" as const
  }

  if (item.allocationStatus === "PARTIALLY_ALLOCATED") {
    return "warning" as const
  }

  return "neutral" as const
}

export function WorkOrderMaterialItemsSection({
  title,
  items,
  productOptions,
  loading,
  subHeader,
  noticeMessage,
  noticeError,
  itemErrors = {},
  expandedItemIds,
  onToggleExpandedItem,
  onItemFieldChange,
  onDeleteItem,
  renderAllocationSection,
}: {
  title: string
  items: WorkOrderMaterialItem[]
  productOptions: MaterialItemOption[]
  loading: boolean
  subHeader?: Omit<RecordSectionSubHeaderProps, "sectionType" | "capabilities">
  noticeMessage?: string
  noticeError?: string
  itemErrors?: RowFieldErrors<MaterialItemField>
  expandedItemIds: string[]
  onToggleExpandedItem: (itemId: string) => void
  onItemFieldChange: (itemId: string, field: keyof EditableMaterialItem, value: string) => void
  onDeleteItem: (itemId: string) => void
  renderAllocationSection: (item: WorkOrderMaterialItem) => ReactNode
}) {
  const metrics = buildMaterialSectionMetrics(items)

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
        supportsNestedAllocations: true,
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
        columns={WORK_ORDER_MATERIAL_COLUMNS}
        isEmpty={items.length === 0}
        emptyState="No material items yet."
      >
        {items.map((item) => {
          const rowErrors = itemErrors[item.id]
          const productLabel = readProductLabel(productOptions, item.productId, item.productName)
          const productUnit = readProductUnit(productOptions, item.productId, item.sendUnit)
          const hasErrors = hasFieldErrors(rowErrors)
          const isExpanded = expandedItemIds.includes(item.id)

          return (
            <RecordSectionGridRow
              key={item.id}
              columns={WORK_ORDER_MATERIAL_COLUMNS}
              nestedContent={isExpanded ? renderAllocationSection(item) : null}
            >
              <RecordMaterialRowBuilder
                productValue={item.productId}
                productOptions={productOptions.map((product) => ({
                  value: product.id,
                  label: product.label,
                }))}
                quantityValue={item.quantity}
                unitLabel={productUnit}
                unitPriceValue={item.unitPrice}
                unitPriceUnit={productUnit || "unit"}
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
                  capabilities: { supportsNestedAllocations: true, supportsStatusColumn: true, supportsRemoveRow: true },
                  toggle: {
                    columnKey: "allocations",
                    label: "Show / Hide",
                    expanded: isExpanded,
                    onToggle: () => onToggleExpandedItem(item.id),
                    ariaLabel: isExpanded ? `Hide allocations for ${productLabel}` : `Show allocations for ${productLabel}`,
                  },
                  status: {
                    content: (
                      <RecordRowStatusBadge tone={readMaterialRowStatusTone(item, hasErrors)}>
                        {readMaterialRowStatus(item, hasErrors)}
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
