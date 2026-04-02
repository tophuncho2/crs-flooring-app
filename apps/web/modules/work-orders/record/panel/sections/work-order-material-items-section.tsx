"use client"

import type { ReactNode } from "react"
import {
  getRecordAllocationStateStatus,
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
import { WORK_ORDER_MATERIAL_COLUMNS } from "./work-order-line-item-grid"
import { buildMaterialSectionMetrics } from "./work-order-section-metrics"
import type { WorkOrderMaterialItem } from "@/modules/work-orders/types"
import { Fragment } from "react"

function readProductLabel(options: MaterialItemOption[], productId: string, fallback: string) {
  return options.find((product) => product.id === productId)?.label || fallback || "Untitled Material"
}

function readProductUnit(options: MaterialItemOption[], productId: string, fallback: string) {
  return options.find((product) => product.id === productId)?.sendUnit || fallback || "-"
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
  renderAllocations,
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
  renderAllocations: (item: WorkOrderMaterialItem) => ReactNode
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
        supportsScopedRows: true,
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
        {items.map((item, index) => {
          const rowErrors = itemErrors[item.id]
          const productLabel = readProductLabel(productOptions, item.productId, item.productName)
          const productUnit = readProductUnit(productOptions, item.productId, item.sendUnit)
          const hasErrors = hasFieldErrors(rowErrors)
          const isExpanded = expandedItemIds.includes(item.id)
          const status = resolveRecordRowStatus({
            hasErrors,
            isUnsaved: item.id.startsWith("temp:"),
            override: getRecordAllocationStateStatus(item.allocationStatus),
          })

          return (
            <Fragment key={item.id}>
              <RecordSectionGridRow
                columns={WORK_ORDER_MATERIAL_COLUMNS}
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
                  showCellLabels={index === 0}
                  onProductChange={(value) => onItemFieldChange(item.id, "productId", value)}
                  onQuantityChange={(value) => onItemFieldChange(item.id, "quantity", normalizeEditableDecimalInput(value))}
                  onUnitPriceChange={(value) => onItemFieldChange(item.id, "unitPrice", normalizeEditableDecimalInput(value))}
                  onNotesChange={(value) => onItemFieldChange(item.id, "notes", value)}
                  controls={{
                    capabilities: { supportsScopedRows: true, supportsStatusColumn: true, supportsRemoveRow: true },
                    toggle: {
                      columnKey: "allocations",
                      label: "Show / Hide",
                      expanded: isExpanded,
                      onToggle: () => onToggleExpandedItem(item.id),
                      ariaLabel: isExpanded ? `Hide allocations for ${productLabel}` : `Show allocations for ${productLabel}`,
                    },
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
              {isExpanded ? renderAllocations(item) : null}
            </Fragment>
          )
        })}
      </RecordSectionGrid>
    </RecordItemSection>
  )
}
