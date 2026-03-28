"use client"

import { DeleteRowButton, SaveRowButton } from "@/features/dashboard/shared/table/row-action-buttons"
import { RecordInlineActionsCell } from "@/features/dashboard/shared/record-view/sections/record-inline-actions-cell"
import { RecordItemCell } from "@/features/dashboard/shared/record-view/sections/record-item-cell"
import { RecordSectionMetric } from "@/features/dashboard/shared/record-view/sections/record-section-metric"
import { RecordSectionShell } from "@/features/dashboard/shared/record-view/sections/record-section-shell"
import { RECORD_SECTION_BORDER_CLASS_NAME } from "@/features/dashboard/shared/record-view/sections/record-section-tokens"
import {
  InlineAddRowButton,
  useInlineCreateRow,
} from "@/features/dashboard/shared/record-view/child-tables/collapsible-table-section"
import {
  calculateSalesRepAmount,
  type EditableSalesRepItem,
  type SalesRepDraft,
  type SalesRepField,
  type SalesRepFieldErrors,
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
  savingItemId,
  deletingItemId,
  itemErrors = {},
  onItemFieldChange,
  onSaveItem,
  onDeleteItem,
}: {
  item: EditableSalesRepItem
  salesRepOptions: SalesRepOption[]
  customerCost: number
  savingItemId: string | null
  deletingItemId: string | null
  itemErrors?: RowFieldErrors<SalesRepField>
  onItemFieldChange: (itemId: string, field: keyof EditableSalesRepItem, value: string) => void
  onSaveItem: (item: EditableSalesRepItem) => void
  onDeleteItem: (itemId: string) => void
}) {
  const rowErrors = itemErrors[item.id]

  return (
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
      <RecordInlineActionsCell>
        <div className="grid grid-cols-2 gap-2">
          <SaveRowButton onClick={() => onSaveItem(item)} disabled={savingItemId === item.id} className="w-full">
            {savingItemId === item.id ? "Saving..." : "Save"}
          </SaveRowButton>
          <DeleteRowButton onClick={() => onDeleteItem(item.id)} disabled={deletingItemId === item.id} className="w-full">
            {deletingItemId === item.id ? "Deleting..." : "Delete"}
          </DeleteRowButton>
        </div>
      </RecordInlineActionsCell>
    </div>
  )
}

function SalesRepDraftRow({
  draft,
  salesRepOptions,
  customerCost,
  adding,
  draftErrors = {},
  onDraftChange,
  onAdd,
}: {
  draft: SalesRepDraft
  salesRepOptions: SalesRepOption[]
  customerCost: number
  adding: boolean
  draftErrors?: SalesRepFieldErrors
  onDraftChange: (field: keyof SalesRepDraft, value: string) => void
  onAdd: () => void
}) {
  return (
    <div className={[WORK_ORDER_SALES_REP_GRID_CLASS_NAME, hasFieldErrors(draftErrors) ? "bg-rose-500/[0.03]" : ""].filter(Boolean).join(" ")}>
      <RecordItemCell label="Sales Rep">
        <div className="space-y-1">
          <select
            value={draft.contactId}
            onChange={(event) => onDraftChange("contactId", event.target.value)}
            className={getFieldControlClassName(
              "w-full rounded border border-[var(--panel-border)] bg-transparent px-2 py-1",
              Boolean(draftErrors.contactId),
            )}
          >
            <option value="">Select sales rep</option>
            {salesRepOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.name}
              </option>
            ))}
          </select>
          {draftErrors.contactId ? <FieldErrorText>{draftErrors.contactId}</FieldErrorText> : null}
        </div>
      </RecordItemCell>
      <RecordItemCell label="Percent">
        <div className="space-y-1">
          <div
            className={getFieldControlClassName(
              "flex w-full items-center gap-2 rounded border border-[var(--panel-border)] px-2 py-1",
              Boolean(draftErrors.percent),
            )}
          >
            <input
              value={draft.percent}
              inputMode="decimal"
              spellCheck={false}
              onChange={(event) => onDraftChange("percent", normalizeEditableDecimalInput(event.target.value))}
              className="w-full bg-transparent outline-none"
            />
            <span className="text-[var(--foreground)]/60">%</span>
          </div>
          {draftErrors.percent ? <FieldErrorText>{draftErrors.percent}</FieldErrorText> : null}
        </div>
      </RecordItemCell>
      <RecordItemCell label="Total">
        <div className="rounded border border-[var(--panel-border)] px-2 py-1 font-medium">
          {formatCurrencyValue(calculateSalesRepAmount(customerCost, draft.percent))}
        </div>
      </RecordItemCell>
      <RecordInlineActionsCell>
        <button
          type="button"
          onClick={onAdd}
          disabled={adding}
          className="rounded-md border border-blue-500/25 px-3 py-2 text-sm font-medium hover:bg-[var(--panel-hover)] disabled:opacity-60"
        >
          {adding ? "Adding..." : "Add"}
        </button>
      </RecordInlineActionsCell>
    </div>
  )
}

export function WorkOrderSalesRepsSection({
  title,
  items,
  draft,
  salesRepOptions,
  customerCost,
  totalAmount,
  loading,
  adding,
  savingItemId,
  deletingItemId,
  draftErrors = {},
  itemErrors = {},
  onDraftChange,
  onAdd,
  onItemFieldChange,
  onSaveItem,
  onDeleteItem,
}: {
  title: string
  items: EditableSalesRepItem[]
  draft: SalesRepDraft
  salesRepOptions: SalesRepOption[]
  customerCost: number
  totalAmount?: number
  loading: boolean
  adding: boolean
  savingItemId: string | null
  deletingItemId: string | null
  draftErrors?: SalesRepFieldErrors
  itemErrors?: RowFieldErrors<SalesRepField>
  onDraftChange: (field: keyof SalesRepDraft, value: string) => void
  onAdd: () => Promise<boolean> | boolean
  onItemFieldChange: (itemId: string, field: keyof EditableSalesRepItem, value: string) => void
  onSaveItem: (item: EditableSalesRepItem) => void
  onDeleteItem: (itemId: string) => void
}) {
  const addRow = useInlineCreateRow(false)
  const metrics = buildSalesRepSectionMetrics(items, totalAmount)

  async function handleAdd() {
    const didAdd = await onAdd()
    if (didAdd !== false) {
      addRow.close()
    }
  }

  return (
    <RecordSectionShell
      title={title}
      bodyClassName="space-y-4"
      metrics={metrics.map((metric) => (
        <RecordSectionMetric key={metric.label} label={metric.label} value={metric.value} />
      ))}
    >
      {loading ? (
        <div className={`${RECORD_SECTION_BORDER_CLASS_NAME} border px-4 py-8 text-center text-[var(--foreground)]/70`}>
          Loading sales reps...
        </div>
      ) : null}
      {!loading
        ? items.map((item) => (
            <div key={item.id}>
              <SalesRepRow
                item={item}
                salesRepOptions={salesRepOptions}
                customerCost={customerCost}
                savingItemId={savingItemId}
                deletingItemId={deletingItemId}
                itemErrors={itemErrors}
                onItemFieldChange={onItemFieldChange}
                onSaveItem={onSaveItem}
                onDeleteItem={onDeleteItem}
              />
            </div>
          ))
        : null}
      {!loading && !addRow.isOpen ? (
        <div className={`${RECORD_SECTION_BORDER_CLASS_NAME} border border-dashed px-4 py-4`}>
          <InlineAddRowButton label={`Add ${title}`} onClick={addRow.open} className={RECORD_SECTION_BORDER_CLASS_NAME} />
        </div>
      ) : null}
      {!loading && addRow.isOpen ? (
        <div className={`${RECORD_SECTION_BORDER_CLASS_NAME} border px-4 py-4`}>
          <SalesRepDraftRow
            draft={draft}
            salesRepOptions={salesRepOptions}
            customerCost={customerCost}
            adding={adding}
            draftErrors={draftErrors}
            onDraftChange={onDraftChange}
            onAdd={() => void handleAdd()}
          />
        </div>
      ) : null}
    </RecordSectionShell>
  )
}
