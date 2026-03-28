"use client"

import type { ReactNode } from "react"
import { DeleteRowButton } from "@/features/dashboard/shared/table/row-action-buttons"
import { RecordItemCell } from "@/features/dashboard/shared/record-view/sections/record-item-cell"
import { RecordSectionItem } from "@/features/dashboard/shared/record-view/sections/record-section-item"
import { RecordSectionStatusBadge } from "@/features/dashboard/shared/record-view/sections/record-section-action-panel"
import { RecordSectionMetric } from "@/features/dashboard/shared/record-view/sections/record-section-metric"
import { RecordSectionShell } from "@/features/dashboard/shared/record-view/sections/record-section-shell"
import { RECORD_SECTION_BORDER_CLASS_NAME } from "@/features/dashboard/shared/record-view/sections/record-section-tokens"
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
import {
  WORK_ORDER_SALES_REP_GRID_CLASS_NAME,
} from "@/features/flooring/work-orders/components/record/sections/work-order-line-item-grid"
import { buildSalesRepSectionMetrics } from "@/features/flooring/work-orders/components/record/sections/work-order-section-metrics"

function SalesRepRow({
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
  const isLocalOnlyItem = item.id.startsWith("temp:")

  return (
    <RecordSectionItem
      status={
        <>
          <RecordSectionStatusBadge tone={isLocalOnlyItem ? "warning" : "neutral"}>
            {isLocalOnlyItem ? "Unsaved" : "Ready"}
          </RecordSectionStatusBadge>
          {hasFieldErrors(rowErrors) ? <RecordSectionStatusBadge tone="error">Needs review</RecordSectionStatusBadge> : null}
        </>
      }
      actions={
        <DeleteRowButton onClick={() => onDeleteItem(item.id)} className="w-full">
          Remove
        </DeleteRowButton>
      }
    >
      <div className={WORK_ORDER_SALES_REP_GRID_CLASS_NAME}>
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
      </div>
    </RecordSectionItem>
  )
}

export function WorkOrderSalesRepsSection({
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
  const metrics = buildSalesRepSectionMetrics(items, totalAmount)

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
            <SalesRepRow
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
