"use client"

import type { ReactNode } from "react"
import { DeleteRowButton } from "@/features/dashboard/shared/table/row-action-buttons"
import {
  RecordItemCell,
  RecordSectionItem,
  RecordSectionMetric,
  RecordSectionShell,
  RecordSectionStatusBadge,
  RECORD_SECTION_BORDER_CLASS_NAME,
} from "@/features/shared/engines/record-view"
import {
  calculateSalesRepAmount,
  type EditableSalesRepItem,
  type SalesRepField,
  type SalesRepOption,
} from "@/features/flooring/shared/line-items/sales-rep-items-editor"
import { formatCurrencyValue } from "@/features/flooring/shared/line-items/line-totals"
import { normalizeEditableDecimalInput } from "@/features/flooring/shared/line-items/child-item-validation"
import {
  FieldErrorText,
  getFieldControlClassName,
  hasFieldErrors,
  type RowFieldErrors,
} from "@/features/flooring/shared/line-items/record-field-errors"
import { TEMPLATE_SALES_REP_GRID_CLASS_NAME } from "./template-line-item-grid"
import { buildTemplateSalesRepSectionMetrics } from "./template-section-metrics"

function readStatusLabel(item: EditableSalesRepItem, hasErrors: boolean) {
  if (hasErrors) return "Needs Review"
  if (item.id.startsWith("temp:")) return "Unsaved"
  return "Ready"
}

function readStatusTone(item: EditableSalesRepItem, hasErrors: boolean) {
  if (hasErrors) return "error" as const
  if (item.id.startsWith("temp:")) return "warning" as const
  return "neutral" as const
}

function TemplateSalesRepRow({
  item,
  salesRepOptions,
  customerCost,
  itemErrors = {},
  onItemFieldChange,
  onDeleteItem,
}: {
  item: EditableSalesRepItem
  salesRepOptions: SalesRepOption[]
  customerCost: number
  itemErrors?: RowFieldErrors<SalesRepField>
  onItemFieldChange: (itemId: string, field: keyof EditableSalesRepItem, value: string) => void
  onDeleteItem: (itemId: string) => void
}) {
  const rowErrors = itemErrors[item.id]
  const hasErrors = hasFieldErrors(rowErrors)

  return (
    <RecordSectionItem>
      <div className={TEMPLATE_SALES_REP_GRID_CLASS_NAME}>
        <RecordItemCell label="Sales Rep">
          <div className="space-y-1">
            <select
              value={item.contactId}
              onChange={(event) => {
                const nextContactId = event.target.value
                const selected = salesRepOptions.find((option) => option.id === nextContactId)
                onItemFieldChange(item.id, "contactId", nextContactId)
                onItemFieldChange(item.id, "contactName", selected?.name ?? "")
              }}
              className={getFieldControlClassName(
                "w-full rounded border border-[var(--panel-border)] bg-transparent px-2 py-1",
                Boolean(rowErrors?.contactId),
              )}
            >
              <option value="">Select sales rep</option>
              {salesRepOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.name}
                </option>
              ))}
            </select>
            {rowErrors?.contactId ? <FieldErrorText>{rowErrors.contactId}</FieldErrorText> : null}
          </div>
        </RecordItemCell>
        <RecordItemCell label="Percent">
          <div className="space-y-1">
            <div
              className={getFieldControlClassName(
                "flex w-full items-center gap-2 rounded border border-[var(--panel-border)] px-2 py-1",
                Boolean(rowErrors?.percent),
              )}
            >
              <input
                value={item.percent}
                inputMode="decimal"
                spellCheck={false}
                onChange={(event) => onItemFieldChange(item.id, "percent", normalizeEditableDecimalInput(event.target.value))}
                className="w-full bg-transparent outline-none"
              />
              <span className="text-[var(--foreground)]/60">%</span>
            </div>
            {rowErrors?.percent ? <FieldErrorText>{rowErrors.percent}</FieldErrorText> : null}
          </div>
        </RecordItemCell>
        <RecordItemCell label="Total">
          <div className="rounded border border-[var(--panel-border)] px-2 py-1 font-medium">
            {formatCurrencyValue(calculateSalesRepAmount(customerCost, item.percent))}
          </div>
        </RecordItemCell>
        <RecordItemCell label="Status">
          <div className="flex min-h-[2.5rem] items-center">
            <RecordSectionStatusBadge tone={readStatusTone(item, hasErrors)} className="min-w-[8.75rem] justify-center">
              {readStatusLabel(item, hasErrors)}
            </RecordSectionStatusBadge>
          </div>
        </RecordItemCell>
        <RecordItemCell label="Remove">
          <div className="flex min-h-[2.5rem] items-center justify-start xl:justify-end">
            <DeleteRowButton onClick={() => onDeleteItem(item.id)} className="whitespace-nowrap px-2.5">
              Remove
            </DeleteRowButton>
          </div>
        </RecordItemCell>
      </div>
    </RecordSectionItem>
  )
}

export function TemplateSalesRepsSection({
  title,
  items,
  salesRepOptions,
  customerCost,
  totalAmount,
  loading,
  actionPanel,
  itemErrors = {},
  onItemFieldChange,
  onDeleteItem,
}: {
  title: string
  items: EditableSalesRepItem[]
  salesRepOptions: SalesRepOption[]
  customerCost: number
  totalAmount?: number
  loading: boolean
  actionPanel?: ReactNode
  itemErrors?: RowFieldErrors<SalesRepField>
  onItemFieldChange: (itemId: string, field: keyof EditableSalesRepItem, value: string) => void
  onDeleteItem: (itemId: string) => void
}) {
  const metrics = buildTemplateSalesRepSectionMetrics(items, totalAmount)

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
          Loading sales reps...
        </div>
      ) : null}
      {!loading && items.length === 0 ? (
        <div className={`${RECORD_SECTION_BORDER_CLASS_NAME} border border-dashed px-4 py-8 text-center text-[var(--foreground)]/65`}>
          No sales reps yet.
        </div>
      ) : null}
      {!loading
        ? items.map((item) => (
            <TemplateSalesRepRow
              key={item.id}
              item={item}
              salesRepOptions={salesRepOptions}
              customerCost={customerCost}
              itemErrors={itemErrors}
              onItemFieldChange={onItemFieldChange}
              onDeleteItem={onDeleteItem}
            />
          ))
        : null}
    </RecordSectionShell>
  )
}
