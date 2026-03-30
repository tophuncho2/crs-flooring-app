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
        columns={TEMPLATE_SALES_REP_COLUMNS}
        isEmpty={items.length === 0}
        emptyState="No sales reps yet."
      >
        {items.map((item) => {
          const rowErrors = itemErrors[item.id]
          const hasErrors = hasFieldErrors(rowErrors)

          return (
            <RecordSectionGridRow key={item.id} columns={TEMPLATE_SALES_REP_COLUMNS}>
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
                      <RecordRowStatusBadge tone={readStatusTone(item, hasErrors)}>
                        {readStatusLabel(item, hasErrors)}
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
