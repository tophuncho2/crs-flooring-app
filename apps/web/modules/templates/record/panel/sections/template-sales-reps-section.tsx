"use client"

import {
  resolveRecordRowStatus,
  RecordItemSection,
  RecordRowStatusBadge,
  RecordSalesRepRowBuilder,
  RecordSectionGrid,
  RecordSectionGridRow,
  type RecordSectionSubHeaderProps,
} from "@/modules/shared/engines/record-view"
import {
  calculateSalesRepAmount,
  type EditableSalesRepItem,
  type SalesRepField,
  type SalesRepOption,
} from "@/modules/shared/ui/record-items/sales-rep-items-editor"
import { formatCurrencyValue } from "@/modules/shared/domain/line-totals"
import { normalizeEditableDecimalInput } from "@/modules/shared/domain/child-item-validation"
import {
  hasFieldErrors,
  type RowFieldErrors,
} from "@/modules/shared/ui/record-items/record-field-errors"
import { TEMPLATE_SALES_REP_COLUMNS } from "./template-line-item-grid"
import { buildTemplateSalesRepSectionMetrics } from "./template-section-metrics"

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
        {items.map((item, index) => {
          const rowErrors = itemErrors[item.id]
          const status = resolveRecordRowStatus({
            hasErrors: hasFieldErrors(rowErrors),
            isUnsaved: item.id.startsWith("temp:"),
          })

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
                showCellLabels={index === 0}
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
          )
        })}
      </RecordSectionGrid>
    </RecordItemSection>
  )
}
