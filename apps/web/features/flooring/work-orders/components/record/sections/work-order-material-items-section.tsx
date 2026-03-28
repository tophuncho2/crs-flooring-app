"use client"

import { type ReactNode } from "react"
import { ChevronDown, ChevronRight } from "lucide-react"
import { DeleteRowButton, SaveRowButton } from "@/features/dashboard/shared/table/row-action-buttons"
import {
  RecordInlineActionsCell,
} from "@/features/dashboard/shared/record-view/sections/record-inline-actions-cell"
import { RecordItemCell } from "@/features/dashboard/shared/record-view/sections/record-item-cell"
import { RecordNestedArea } from "@/features/dashboard/shared/record-view/sections/record-nested-area"
import { RecordSectionMetric } from "@/features/dashboard/shared/record-view/sections/record-section-metric"
import { RecordSectionShell } from "@/features/dashboard/shared/record-view/sections/record-section-shell"
import { RECORD_SECTION_BORDER_CLASS_NAME } from "@/features/dashboard/shared/record-view/sections/record-section-tokens"
import {
  InlineAddRowButton,
  useInlineCreateRow,
} from "@/features/dashboard/shared/record-view/child-tables/collapsible-table-section"
import {
  calculateLineTotal,
  formatCurrencyValue,
  formatLineTotal,
} from "@/features/flooring/shared/line-items/line-totals"
import { isEditableDecimalInput, normalizeEditableDecimalInput } from "@/features/flooring/shared/line-items/child-item-validation"
import { LineItemPriceField, LineItemQuantityField, LineItemTotalField } from "@/features/flooring/shared/ui/record-items/line-item-table-cells"
import {
  FieldErrorText,
  getFieldControlClassName,
  hasFieldErrors,
  type RowFieldErrors,
} from "@/features/flooring/shared/line-items/record-field-errors"
import type {
  EditableMaterialItem,
  MaterialItemDraft,
  MaterialItemField,
  MaterialItemFieldErrors,
  MaterialItemOption,
} from "@/features/flooring/shared/line-items/material-items-editor"
import { validateMaterialItemFields } from "@/features/flooring/shared/line-items/material-items-editor"
import { useRowAutosave } from "@/features/flooring/shared/line-items/use-row-autosave"
import {
  WORK_ORDER_MATERIAL_GRID_CLASS_NAME,
} from "@/features/flooring/work-orders/components/record/sections/work-order-line-item-grid"
import { buildMaterialSectionMetrics } from "@/features/flooring/work-orders/components/record/sections/work-order-section-metrics"
import type { WorkOrderMaterialItem } from "@/features/flooring/work-orders/types"

function readProductLabel(options: MaterialItemOption[], productId: string, fallback: string) {
  return options.find((product) => product.id === productId)?.label || fallback || "Untitled Material"
}

function readProductUnit(options: MaterialItemOption[], productId: string, fallback: string) {
  return options.find((product) => product.id === productId)?.sendUnit || fallback || "-"
}

function MaterialItemEditorRow({
  item,
  productOptions,
  isExpanded,
  savingItemId,
  deletingItemId,
  itemErrors = {},
  onItemFieldChange,
  onSaveItem,
  onDeleteItem,
  onToggleAllocations,
}: {
  item: WorkOrderMaterialItem
  productOptions: MaterialItemOption[]
  isExpanded: boolean
  savingItemId: string | null
  deletingItemId: string | null
  itemErrors?: RowFieldErrors<MaterialItemField>
  onItemFieldChange: (itemId: string, field: keyof EditableMaterialItem, value: string) => void
  onSaveItem: (item: EditableMaterialItem) => Promise<boolean> | boolean
  onDeleteItem: (itemId: string) => void
  onToggleAllocations: () => void
}) {
  const rowErrors = itemErrors[item.id]
  const productLabel = readProductLabel(productOptions, item.productId, item.productName)
  const autosave = useRowAutosave({
    rowId: item.id,
    value: item,
    serialize: (currentItem) =>
      JSON.stringify({
        productId: currentItem.productId,
        quantity: currentItem.quantity,
        unitPrice: currentItem.unitPrice,
        notes: currentItem.notes,
      }),
    canAutosave: Object.keys(validateMaterialItemFields(item)).length === 0,
    onSave: onSaveItem,
  })

  return (
    <div {...autosave.focusLeaveProps} className={WORK_ORDER_MATERIAL_GRID_CLASS_NAME}>
      <RecordItemCell label="Product">
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
      <RecordItemCell label="Qty">
        <div className="space-y-1">
          <LineItemQuantityField
            className={getFieldControlClassName("w-full", Boolean(rowErrors?.quantity))}
            input={
              <input
                value={item.quantity}
                inputMode="decimal"
                spellCheck={false}
                placeholder="Qty"
                onChange={(event) => onItemFieldChange(item.id, "quantity", normalizeEditableDecimalInput(event.target.value))}
                className="w-16 bg-transparent outline-none"
              />
            }
            unit={<span className="whitespace-nowrap">{readProductUnit(productOptions, item.productId, item.sendUnit)}</span>}
          />
          {rowErrors?.quantity ? <FieldErrorText>{rowErrors.quantity}</FieldErrorText> : null}
        </div>
      </RecordItemCell>
      <RecordItemCell label="Unit Price">
        <div className="space-y-1">
          <LineItemPriceField
            className={getFieldControlClassName("w-full", Boolean(rowErrors?.unitPrice))}
            input={
              <input
                value={item.unitPrice}
                inputMode="decimal"
                spellCheck={false}
                onChange={(event) => onItemFieldChange(item.id, "unitPrice", normalizeEditableDecimalInput(event.target.value))}
                className="w-16 bg-transparent outline-none"
              />
            }
            unit={readProductUnit(productOptions, item.productId, item.sendUnit) || "unit"}
          />
          {rowErrors?.unitPrice ? <FieldErrorText>{rowErrors.unitPrice}</FieldErrorText> : null}
        </div>
      </RecordItemCell>
      <RecordItemCell label="Total">
        <LineItemTotalField value={formatLineTotal(item)} className="w-full justify-end" />
      </RecordItemCell>
      <RecordItemCell label="Notes">
        <input
          value={item.notes}
          onChange={(event) => onItemFieldChange(item.id, "notes", event.target.value)}
          className="w-full rounded border border-[var(--panel-border)] bg-transparent px-2 py-1"
        />
      </RecordItemCell>
      <RecordInlineActionsCell>
        <button
          type="button"
          onClick={onToggleAllocations}
          aria-expanded={isExpanded}
          aria-label={isExpanded ? `Hide allocations for ${productLabel}` : `Show allocations for ${productLabel}`}
          className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-blue-500/25 px-3 py-2 text-sm font-medium text-[var(--foreground)] transition hover:bg-[var(--panel-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40"
        >
          {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          <span>{isExpanded ? "Hide Allocations" : "Show Allocations"}</span>
        </button>
        <div className="grid grid-cols-2 gap-2">
          <SaveRowButton onClick={() => void onSaveItem(item)} disabled={savingItemId === item.id} className="w-full">
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

function MaterialDraftRow({
  draft,
  productOptions,
  adding,
  draftErrors = {},
  onDraftChange,
  onAdd,
}: {
  draft: MaterialItemDraft
  productOptions: MaterialItemOption[]
  adding: boolean
  draftErrors?: MaterialItemFieldErrors
  onDraftChange: (field: keyof MaterialItemDraft, value: string) => void
  onAdd: () => void
}) {
  return (
    <div
      className={[
        WORK_ORDER_MATERIAL_GRID_CLASS_NAME,
        hasFieldErrors(draftErrors) ? "bg-rose-500/[0.03]" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <RecordItemCell label="Product">
        <div className="space-y-1">
          <select
            value={draft.productId}
            onChange={(event) => onDraftChange("productId", event.target.value)}
            className={getFieldControlClassName(
              "w-full rounded border border-[var(--panel-border)] bg-transparent px-2 py-1",
              Boolean(draftErrors.productId),
            )}
          >
            <option value="">Select product</option>
            {productOptions.map((product) => (
              <option key={product.id} value={product.id}>
                {product.label}
              </option>
            ))}
          </select>
          {draftErrors.productId ? <FieldErrorText>{draftErrors.productId}</FieldErrorText> : null}
        </div>
      </RecordItemCell>
      <RecordItemCell label="Qty">
        <div className="space-y-1">
          <LineItemQuantityField
            className={getFieldControlClassName("w-full", Boolean(draftErrors.quantity))}
            input={
              <input
                value={draft.quantity}
                inputMode="decimal"
                spellCheck={false}
                placeholder="Qty"
                onChange={(event) => {
                  const value = normalizeEditableDecimalInput(event.target.value)
                  if (value === "" || isEditableDecimalInput(value, 2)) {
                    onDraftChange("quantity", value)
                  }
                }}
                className="w-16 bg-transparent outline-none"
              />
            }
            unit={<span className="whitespace-nowrap">{readProductUnit(productOptions, draft.productId, "-")}</span>}
          />
          {draftErrors.quantity ? <FieldErrorText>{draftErrors.quantity}</FieldErrorText> : null}
        </div>
      </RecordItemCell>
      <RecordItemCell label="Unit Price">
        <div className="space-y-1">
          <LineItemPriceField
            className={getFieldControlClassName("w-full", Boolean(draftErrors.unitPrice))}
            input={
              <input
                value={draft.unitPrice}
                inputMode="decimal"
                spellCheck={false}
                onChange={(event) => {
                  const value = normalizeEditableDecimalInput(event.target.value)
                  if (value === "" || isEditableDecimalInput(value, 2)) {
                    onDraftChange("unitPrice", value)
                  }
                }}
                className="w-16 bg-transparent outline-none"
              />
            }
            unit={readProductUnit(productOptions, draft.productId, "unit")}
          />
          {draftErrors.unitPrice ? <FieldErrorText>{draftErrors.unitPrice}</FieldErrorText> : null}
        </div>
      </RecordItemCell>
      <RecordItemCell label="Total">
        <LineItemTotalField value={formatCurrencyValue(calculateLineTotal(draft))} className="w-full justify-end" />
      </RecordItemCell>
      <RecordItemCell label="Notes">
        <input
          value={draft.notes}
          onChange={(event) => onDraftChange("notes", event.target.value)}
          className="w-full rounded border border-[var(--panel-border)] bg-transparent px-2 py-1"
        />
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

export function WorkOrderMaterialItemsSection({
  title,
  items,
  draft,
  productOptions,
  loading,
  adding,
  savingItemId,
  deletingItemId,
  draftErrors = {},
  itemErrors = {},
  expandedItemIds,
  onToggleExpandedItem,
  onDraftChange,
  onAdd,
  onItemFieldChange,
  onSaveItem,
  onDeleteItem,
  onRequestAutoAllocation,
  isAutoAllocating,
  renderAllocationSection,
}: {
  title: string
  items: WorkOrderMaterialItem[]
  draft: MaterialItemDraft
  productOptions: MaterialItemOption[]
  loading: boolean
  adding: boolean
  savingItemId: string | null
  deletingItemId: string | null
  draftErrors?: MaterialItemFieldErrors
  itemErrors?: RowFieldErrors<MaterialItemField>
  expandedItemIds: string[]
  onToggleExpandedItem: (itemId: string) => void
  onDraftChange: (field: keyof MaterialItemDraft, value: string) => void
  onAdd: () => Promise<boolean> | boolean
  onItemFieldChange: (itemId: string, field: keyof EditableMaterialItem, value: string) => void
  onSaveItem: (item: EditableMaterialItem) => Promise<boolean> | boolean
  onDeleteItem: (itemId: string) => void
  onRequestAutoAllocation: () => void
  isAutoAllocating: boolean
  renderAllocationSection: (item: WorkOrderMaterialItem) => ReactNode
}) {
  const addRow = useInlineCreateRow(false)
  const metrics = buildMaterialSectionMetrics(items)

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
      actions={
        <button
          type="button"
          onClick={onRequestAutoAllocation}
          disabled={isAutoAllocating || items.length === 0}
          className="rounded-lg border border-blue-500/25 bg-[var(--panel-background)] px-3 py-2 text-sm font-medium text-[var(--foreground)] transition hover:bg-[var(--panel-hover)] disabled:opacity-60"
        >
          {isAutoAllocating ? "Auto Allocating..." : "Auto Allocate"}
        </button>
      }
    >
      {loading ? (
        <div className={`${RECORD_SECTION_BORDER_CLASS_NAME} border px-4 py-8 text-center text-[var(--foreground)]/70`}>
          Loading items...
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
                  savingItemId={savingItemId}
                  deletingItemId={deletingItemId}
                  itemErrors={itemErrors}
                  onItemFieldChange={onItemFieldChange}
                  onSaveItem={onSaveItem}
                  onDeleteItem={onDeleteItem}
                  onToggleAllocations={() => onToggleExpandedItem(item.id)}
                />
                {isExpanded ? <RecordNestedArea>{renderAllocationSection(item)}</RecordNestedArea> : null}
              </div>
            )
          })
        : null}

      {!loading && !addRow.isOpen ? (
        <div className={`${RECORD_SECTION_BORDER_CLASS_NAME} border border-dashed px-4 py-4`}>
          <InlineAddRowButton
            label="Add Material Item"
            onClick={addRow.open}
            className={RECORD_SECTION_BORDER_CLASS_NAME}
          />
        </div>
      ) : null}

      {!loading && addRow.isOpen ? (
        <div className={`${RECORD_SECTION_BORDER_CLASS_NAME} border px-4 py-4`}>
          <MaterialDraftRow
            draft={draft}
            productOptions={productOptions}
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
