"use client"

import type { ReactNode } from "react"
import {
  CurrencyCell,
  RecordFieldErrorText,
  RecordGridCellInput,
  RecordGridCellSelect,
  RecordItemCell,
  RecordRowDeleteButton,
  RecordRowLayout,
  RecordSectionItem,
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
  hasFieldErrors,
  type RowFieldErrors,
} from "@/features/flooring/shared/line-items/record-field-errors"
import { WORK_ORDER_SALES_REP_COLUMNS } from "./work-order-line-item-grid"
import { buildSalesRepSectionMetrics } from "./work-order-section-metrics"

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
    >
      <RecordRowLayout columns={WORK_ORDER_SALES_REP_COLUMNS}>
        <RecordItemCell label="Sales Rep" columnKey="salesRep">
        <div className="space-y-1">
          <RecordGridCellSelect
            value={item.contactId}
            onChange={(event) => {
              const nextContactId = event.target.value
              const selected = salesRepOptions.find((option) => option.id === nextContactId)
              onItemFieldChange(item.id, "contactId", nextContactId)
              onItemFieldChange(item.id, "contactName", selected?.name ?? "")
            }}
            invalid={Boolean(rowErrors?.contactId)}
          >
            <option value="">Select sales rep</option>
            {salesRepOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.name}
              </option>
            ))}
          </RecordGridCellSelect>
          {rowErrors?.contactId ? <RecordFieldErrorText>{rowErrors.contactId}</RecordFieldErrorText> : null}
        </div>
        </RecordItemCell>
        <RecordItemCell label="Percent" columnKey="percent">
        <div className="space-y-1">
          <div className="flex min-h-[2.5rem] items-center gap-2">
            <RecordGridCellInput
              value={item.percent}
              inputMode="decimal"
              spellCheck={false}
              onChange={(event) => onItemFieldChange(item.id, "percent", normalizeEditableDecimalInput(event.target.value))}
              invalid={Boolean(rowErrors?.percent)}
              align="right"
              controlSize="compact"
            />
            <span className="text-[var(--foreground)]/60">%</span>
          </div>
          {rowErrors?.percent ? <RecordFieldErrorText>{rowErrors.percent}</RecordFieldErrorText> : null}
        </div>
        </RecordItemCell>
        <RecordItemCell label="Total" columnKey="total">
        <CurrencyCell value={formatCurrencyValue(calculateSalesRepAmount(customerCost, item.percent))} className="w-full" />
        </RecordItemCell>
        <RecordItemCell label="Status" columnKey="status">
        <div className="flex min-h-[2.5rem] items-center">
          <RecordSectionStatusBadge tone={isLocalOnlyItem ? "warning" : "neutral"}>
            {isLocalOnlyItem ? "Unsaved" : "Ready"}
          </RecordSectionStatusBadge>
          {hasFieldErrors(rowErrors) ? <RecordSectionStatusBadge tone="error">Needs review</RecordSectionStatusBadge> : null}
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
      metrics={metrics}
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
