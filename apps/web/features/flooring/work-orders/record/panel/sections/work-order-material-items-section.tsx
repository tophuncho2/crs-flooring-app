"use client"

import { type ReactNode } from "react"
import { ChevronDown, ChevronRight } from "lucide-react"
import { DeleteRowButton } from "@/features/dashboard/shared/table/row-action-buttons"
import {
  CurrencyCell,
  QuantityCell,
  RecordItemCell,
  RecordRowLayout,
  RecordSectionItem,
  RecordSectionMetric,
  RecordSectionShell,
  RecordSectionStatusBadge,
  RECORD_SECTION_BORDER_CLASS_NAME,
} from "@/features/shared/engines/record-view"
import {
  formatLineTotal,
} from "@/features/flooring/shared/line-items/line-totals"
import { normalizeEditableDecimalInput } from "@/features/flooring/shared/line-items/child-item-validation"
import {
  FieldErrorText,
  getFieldControlClassName,
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
          <select
            value={item.productId}
            onChange={(event) => onItemFieldChange(item.id, "productId", event.target.value)}
            className={getFieldControlClassName(
              "w-full rounded border border-[var(--panel-border)] bg-transparent px-2 py-1",
              Boolean(rowErrors?.productId),
            )}
          >
            {productOptions.map((product) => (
              <option key={product.id} value={product.id}>
                {product.label}
              </option>
            ))}
          </select>
          {rowErrors?.productId ? <FieldErrorText>{rowErrors.productId}</FieldErrorText> : null}
        </div>
        </RecordItemCell>
        <RecordItemCell label="Qty" columnKey="quantity">
        <div className="space-y-1">
          <QuantityCell
            className={getFieldControlClassName("w-full", Boolean(rowErrors?.quantity))}
            input={
              <input
                value={item.quantity}
                inputMode="decimal"
                spellCheck={false}
                placeholder="Qty"
                onChange={(event) => onItemFieldChange(item.id, "quantity", normalizeEditableDecimalInput(event.target.value))}
                className="w-16 bg-transparent text-center outline-none"
              />
            }
            unit={<span className="whitespace-nowrap">{readProductUnit(productOptions, item.productId, item.sendUnit)}</span>}
          />
          {rowErrors?.quantity ? <FieldErrorText>{rowErrors.quantity}</FieldErrorText> : null}
        </div>
        </RecordItemCell>
        <RecordItemCell label="Unit Price" columnKey="unitPrice">
        <div className="space-y-1">
          <CurrencyCell
            className={getFieldControlClassName("w-full", Boolean(rowErrors?.unitPrice))}
            input={
              <input
                value={item.unitPrice}
                inputMode="decimal"
                spellCheck={false}
                onChange={(event) => onItemFieldChange(item.id, "unitPrice", normalizeEditableDecimalInput(event.target.value))}
                className="w-16 bg-transparent text-right outline-none"
              />
            }
            unit={readProductUnit(productOptions, item.productId, item.sendUnit) || "unit"}
          />
          {rowErrors?.unitPrice ? <FieldErrorText>{rowErrors.unitPrice}</FieldErrorText> : null}
        </div>
        </RecordItemCell>
        <RecordItemCell label="Total" columnKey="total">
        <CurrencyCell value={formatLineTotal(item)} className="w-full" />
        </RecordItemCell>
        <RecordItemCell label="Notes" columnKey="notes">
        <input
          value={item.notes}
          onChange={(event) => onItemFieldChange(item.id, "notes", event.target.value)}
          className="w-full rounded border border-[var(--panel-border)] bg-transparent px-2 py-1"
        />
        </RecordItemCell>
        <RecordItemCell label="Allocations" columnKey="allocations">
        <div className="flex min-h-[2.5rem] items-center">
          <button
            type="button"
            onClick={onToggleAllocations}
            aria-expanded={isExpanded}
            aria-label={isExpanded ? `Hide allocations for ${productLabel}` : `Show allocations for ${productLabel}`}
            className="inline-flex min-h-[2.5rem] items-center justify-center gap-2 rounded-md border border-blue-500/25 px-3 py-2 text-sm font-medium text-[var(--foreground)] transition hover:bg-[var(--panel-hover)]"
          >
            {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            <span>{isExpanded ? "Hide" : "Show"}</span>
          </button>
        </div>
        </RecordItemCell>
        <RecordItemCell label="Status" columnKey="status">
        <div className="flex min-h-[2.5rem] items-center">
          <RecordSectionStatusBadge tone={rowStatusTone} className="min-w-[8.75rem] justify-center">
            {rowStatusLabel}
          </RecordSectionStatusBadge>
        </div>
        </RecordItemCell>
        <RecordItemCell label="Remove" columnKey="remove">
        <div className="flex min-h-[2.5rem] items-center justify-start xl:justify-end">
          <DeleteRowButton onClick={() => onDeleteItem(item.id)} className="whitespace-nowrap px-2.5">
            Remove
          </DeleteRowButton>
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
      metrics={metrics.map((metric) => (
        <RecordSectionMetric key={metric.label} label={metric.label} value={metric.value} />
      ))}
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
