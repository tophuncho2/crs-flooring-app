"use client"

import {
  RecordItemSection,
  RecordRowStatusBadge,
  RecordSalesRepRowBuilder,
  RecordSectionGrid,
  RecordSectionGridRow,
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
import { WORK_ORDER_SALES_REP_COLUMNS } from "./work-order-line-item-grid"
import { buildSalesRepSectionMetrics } from "./work-order-section-metrics"

export function WorkOrderSalesRepsSection({
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
  const metrics = buildSalesRepSectionMetrics(items, totalAmount)

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
      loadingState={<div className="border px-4 py-8 text-center text-[var(--foreground)]/70">Loading sales reps...</div>}
      isEmpty={false}
    >
      <RecordSectionGrid
        columns={WORK_ORDER_SALES_REP_COLUMNS}
        isEmpty={items.length === 0}
        emptyState="No sales reps yet."
      >
        {items.map((item) => {
          const rowErrors = itemErrors[item.id]
          const isLocalOnlyItem = item.id.startsWith("temp:")

          return (
            <RecordSectionGridRow key={item.id} columns={WORK_ORDER_SALES_REP_COLUMNS}>
              <RecordSalesRepRowBuilder
                salesRepValue={item.contactId}
                salesRepOptions={salesRepOptions.map((option) => ({
                  value: option.id,
                  label: option.name,
                }))}
                percentValue={item.percent}
                totalValue={formatCurrencyValue(calculateSalesRepAmount(customerCost, item.percent))}
                salesRepError={rowErrors?.contactId}
                percentError={rowErrors?.percent}
                onSalesRepChange={(value) => {
                  const selected = salesRepOptions.find((option) => option.id === value)
                  onItemFieldChange(item.id, "contactId", value)
                  onItemFieldChange(item.id, "contactName", selected?.name ?? "")
                }}
                onPercentChange={(value) => onItemFieldChange(item.id, "percent", normalizeEditableDecimalInput(value))}
                controls={{
                  capabilities: { supportsStatusColumn: true, supportsRemoveRow: true },
                  status: {
                    content: (
                      <>
                        <RecordRowStatusBadge tone={isLocalOnlyItem ? "warning" : "neutral"}>
                          {isLocalOnlyItem ? "Unsaved" : "Ready"}
                        </RecordRowStatusBadge>
                        {hasFieldErrors(rowErrors) ? <RecordRowStatusBadge tone="error">Needs review</RecordRowStatusBadge> : null}
                      </>
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
