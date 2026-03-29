"use client"

import type { ReactNode } from "react"
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

function TemplateMaterialItemRow({
  item,
  productOptions,
  itemErrors = {},
  onItemFieldChange,
  onDeleteItem,
}: {
  item: EditableMaterialItem
  productOptions: MaterialItemOption[]
  itemErrors?: RowFieldErrors<MaterialItemField>
  onItemFieldChange: (itemId: string, field: keyof EditableMaterialItem, value: string) => void
  onDeleteItem: (itemId: string) => void
}) {
  const rowErrors = itemErrors[item.id]
  const hasErrors = hasFieldErrors(rowErrors)

  return (
    <RecordSectionItem>
      <RecordRowLayout columns={TEMPLATE_MATERIAL_COLUMNS}>
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
              <option value="">Select product</option>
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
              unit={<span className="whitespace-nowrap">{item.sendUnit || "-"}</span>}
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
              unit={item.sendUnit || "unit"}
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
        <RecordItemCell label="Status" columnKey="status">
          <div className="flex min-h-[2.5rem] items-center">
            <RecordSectionStatusBadge tone={readStatusTone(item, hasErrors)} className="min-w-[8.75rem] justify-center">
              {readStatusLabel(item, hasErrors)}
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

export function TemplateMaterialItemsSection({
  title,
  items,
  productOptions,
  loading,
  actionPanel,
  itemErrors = {},
  totalAmount,
  onItemFieldChange,
  onDeleteItem,
}: {
  title: string
  items: EditableMaterialItem[]
  productOptions: MaterialItemOption[]
  loading: boolean
  actionPanel?: ReactNode
  itemErrors?: RowFieldErrors<MaterialItemField>
  totalAmount?: number
  onItemFieldChange: (itemId: string, field: keyof EditableMaterialItem, value: string) => void
  onDeleteItem: (itemId: string) => void
}) {
  const metrics = buildTemplateMaterialSectionMetrics(items, totalAmount)

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
        ? items.map((item) => (
            <TemplateMaterialItemRow
              key={item.id}
              item={item}
              productOptions={productOptions}
              itemErrors={itemErrors}
              onItemFieldChange={onItemFieldChange}
              onDeleteItem={onDeleteItem}
            />
          ))
        : null}
    </RecordSectionShell>
  )
}
