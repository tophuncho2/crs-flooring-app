"use client"

import type { ReactNode } from "react"
import {
  CurrencyCell,
  RecordFieldErrorText,
  RecordGridCellInput,
  RecordGridCellSelect,
  RecordItemSection,
  RecordItemSectionControls,
  RecordItemCell,
  RecordRowLayout,
  RecordRowStatusBadge,
  RecordSectionItem,
  type RecordSectionSubHeaderProps,
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
import { TEMPLATE_SALES_REP_COLUMNS } from "./template-line-item-grid"
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
      <RecordRowLayout columns={TEMPLATE_SALES_REP_COLUMNS}>
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
        <RecordItemSectionControls
          capabilities={{ supportsStatusColumn: true, supportsRemoveRow: true }}
          status={{
            content: (
              <RecordRowStatusBadge tone={readStatusTone(item, hasErrors)}>
                {readStatusLabel(item, hasErrors)}
              </RecordRowStatusBadge>
            ),
          }}
          remove={{
            onRemove: () => onDeleteItem(item.id),
          }}
        />
      </RecordRowLayout>
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
  subHeader,
  noticeMessage,
  noticeError,
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
  subHeader?: Omit<RecordSectionSubHeaderProps, "sectionType" | "capabilities">
  noticeMessage?: string
  noticeError?: string
  itemErrors?: RowFieldErrors<SalesRepField>
  onItemFieldChange: (itemId: string, field: keyof EditableSalesRepItem, value: string) => void
  onDeleteItem: (itemId: string) => void
}) {
  const metrics = buildTemplateSalesRepSectionMetrics(items, totalAmount)

  return (
    <RecordItemSection
      title={title}
      bodyClassName="space-y-4"
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
        supportsEmptyState: true,
      }}
      loading={loading}
      loadingState={<div className="border px-4 py-8 text-center text-[var(--foreground)]/70">Loading sales reps...</div>}
      isEmpty={items.length === 0}
      emptyState={<div className="border border-dashed px-4 py-8 text-center text-[var(--foreground)]/65">No sales reps yet.</div>}
    >
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
    </RecordItemSection>
  )
}
