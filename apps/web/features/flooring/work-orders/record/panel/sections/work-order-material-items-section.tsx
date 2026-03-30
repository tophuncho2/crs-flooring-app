"use client"

import { type ReactNode } from "react"
import {
  CurrencyCell,
  QuantityCell,
  RecordGridCellInput,
  RecordGridCellSelect,
  RecordItemCell,
  RecordRowDeleteButton,
  RecordRowLayout,
  RecordRowStatusBadge,
  RecordRowToggleButton,
  RecordSectionItem,
  RecordSectionShell,
  RECORD_SECTION_BORDER_CLASS_NAME,
} from "@/features/shared/engines/record-view"
import {
  formatLineTotal,
} from "@/features/flooring/shared/line-items/line-totals"
import { normalizeEditableDecimalInput } from "@/features/flooring/shared/line-items/child-item-validation"
import {
  hasFieldErrors,
  type RowFieldErrors,
} from "@/features/flooring/shared/line-items/record-field-errors"
import { RecordFieldErrorText } from "@/features/shared/engines/record-view"
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

function MaterialItemEditorRow({
  item,
  productOptions,
  isExpanded,
  allocationContent,
  itemErrors = {},
  onItemFieldChange,
  onDeleteItem,
  onToggleAllocations,
}: {
  item: WorkOrderMaterialItem
  productOptions: MaterialItemOption[]
  isExpanded: boolean
  allocationContent?: ReactNode
  itemErrors?: RowFieldErrors<MaterialItemField>
  onItemFieldChange: (itemId: string, field: keyof EditableMaterialItem, value: string) => void
  onDeleteItem: (itemId: string) => void
  onToggleAllocations: () => void
}) {
  const rowErrors = itemErrors[item.id]
  const productLabel = readProductLabel(productOptions, item.productId, item.productName)
  const hasErrors = hasFieldErrors(rowErrors)
  const rowStatusLabel = readMaterialRowStatus(item, hasErrors)
  const rowStatusTone = readMaterialRowStatusTone(item, hasErrors)

  return (
    <RecordSectionItem
      bodyClassName={isExpanded ? "pb-0" : undefined}
      nestedContentClassName={isExpanded ? "border-t-0" : undefined}
      nestedContent={
        isExpanded ? (
          allocationContent
        ) : null
      }
    >
      <RecordRowLayout columns={WORK_ORDER_MATERIAL_COLUMNS}>
        <RecordItemCell label="Product" columnKey="product">
        <div className="space-y-1">
          <RecordGridCellSelect
            value={item.productId}
            onChange={(event) => onItemFieldChange(item.id, "productId", event.target.value)}
            invalid={Boolean(rowErrors?.productId)}
          >
            {productOptions.map((product) => (
              <option key={product.id} value={product.id}>
                {product.label}
              </option>
            ))}
          </RecordGridCellSelect>
          {rowErrors?.productId ? <RecordFieldErrorText>{rowErrors.productId}</RecordFieldErrorText> : null}
        </div>
        </RecordItemCell>
        <RecordItemCell label="Qty" columnKey="quantity">
        <div className="space-y-1">
          <QuantityCell
            input={
              <RecordGridCellInput
                value={item.quantity}
                inputMode="decimal"
                spellCheck={false}
                placeholder="Qty"
                onChange={(event) => onItemFieldChange(item.id, "quantity", normalizeEditableDecimalInput(event.target.value))}
                invalid={Boolean(rowErrors?.quantity)}
                align="center"
                controlSize="compact"
              />
            }
            unit={<span className="whitespace-nowrap">{readProductUnit(productOptions, item.productId, item.sendUnit)}</span>}
          />
          {rowErrors?.quantity ? <RecordFieldErrorText>{rowErrors.quantity}</RecordFieldErrorText> : null}
        </div>
        </RecordItemCell>
        <RecordItemCell label="Unit Price" columnKey="unitPrice">
        <div className="space-y-1">
          <CurrencyCell
            input={
              <RecordGridCellInput
                value={item.unitPrice}
                inputMode="decimal"
                spellCheck={false}
                onChange={(event) => onItemFieldChange(item.id, "unitPrice", normalizeEditableDecimalInput(event.target.value))}
                invalid={Boolean(rowErrors?.unitPrice)}
                align="right"
                controlSize="compact"
              />
            }
            unit={readProductUnit(productOptions, item.productId, item.sendUnit) || "unit"}
          />
          {rowErrors?.unitPrice ? <RecordFieldErrorText>{rowErrors.unitPrice}</RecordFieldErrorText> : null}
        </div>
        </RecordItemCell>
        <RecordItemCell label="Total" columnKey="total">
        <CurrencyCell value={formatLineTotal(item)} className="w-full" />
        </RecordItemCell>
        <RecordItemCell label="Notes" columnKey="notes">
        <RecordGridCellInput
          value={item.notes}
          onChange={(event) => onItemFieldChange(item.id, "notes", event.target.value)}
        />
        </RecordItemCell>
        <RecordItemCell label="Allocations" columnKey="allocations">
        <div className="flex min-h-[2.5rem] items-center">
          <RecordRowToggleButton
            expanded={isExpanded}
            onToggle={onToggleAllocations}
            ariaLabel={isExpanded ? `Hide allocations for ${productLabel}` : `Show allocations for ${productLabel}`}
          />
        </div>
        </RecordItemCell>
        <RecordItemCell label="Status" columnKey="status">
        <div className="flex min-h-[2.5rem] items-center">
          <RecordRowStatusBadge tone={rowStatusTone}>
            {rowStatusLabel}
          </RecordRowStatusBadge>
        </div>
        </RecordItemCell>
        <RecordItemCell label="Remove" columnKey="remove">
        <div className="flex min-h-[2.5rem] items-center justify-start xl:justify-end">
          <RecordRowDeleteButton onClick={() => onDeleteItem(item.id)}>Remove</RecordRowDeleteButton>
        </div>
        </RecordItemCell>
      </RecordRowLayout>
    </RecordSectionItem>
  )
}

export function WorkOrderMaterialItemsSection({
  title,
  items,
  productOptions,
  loading,
  actionPanel,
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
  actionPanel?: ReactNode
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
    <RecordSectionShell
      title={title}
      bodyClassName="space-y-4"
      statusPanel={actionPanel}
      noticeMessage={noticeMessage}
      noticeError={noticeError}
      metrics={metrics}
    >
      {loading ? (
        <div className={`${RECORD_SECTION_BORDER_CLASS_NAME} border px-4 py-8 text-center text-[var(--foreground)]/70`}>
          Loading items...
        </div>
      ) : null}
      {!loading && items.length === 0 ? (
        <div className={`${RECORD_SECTION_BORDER_CLASS_NAME} border border-dashed px-4 py-8 text-center text-[var(--foreground)]/65`}>
          No material items yet.
        </div>
      ) : null}

      {!loading
        ? items.map((item) => {
            const isExpanded = expandedItemIds.includes(item.id)

            return (
              <div key={item.id} className="space-y-0">
                <MaterialItemEditorRow
                  item={item}
                  productOptions={productOptions}
                  isExpanded={isExpanded}
                  allocationContent={renderAllocationSection(item)}
                  itemErrors={itemErrors}
                  onItemFieldChange={onItemFieldChange}
                  onDeleteItem={onDeleteItem}
                  onToggleAllocations={() => onToggleExpandedItem(item.id)}
                />
              </div>
            )
          })
        : null}
    </RecordSectionShell>
  )
}
