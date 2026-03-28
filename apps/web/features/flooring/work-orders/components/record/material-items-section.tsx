"use client"

import { type ReactNode, useMemo } from "react"
import { ChevronDown, ChevronRight } from "lucide-react"
import { DeleteRowButton, SaveRowButton } from "@/features/dashboard/shared/table/row-action-buttons"
import { TableBleed } from "@/features/dashboard/shared/table/table-shell"
import {
  InlineAddRowButton,
  useCollapsibleSection,
  useInlineCreateRow,
} from "@/features/dashboard/shared/record-view/child-tables/collapsible-table-section"
import {
  calculateLineTotal,
  formatCurrencyValue,
  formatLineTotal,
  sumLineTotals,
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
import type { WorkOrderMaterialItem } from "@/features/flooring/work-orders/types"

function joinClasses(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ")
}

function formatQuantitySummary(value: string, unit: string) {
  return `${value || "0"} ${unit || ""}`.trim()
}

function readProductLabel(options: MaterialItemOption[], productId: string, fallback: string) {
  return options.find((product) => product.id === productId)?.label || fallback || "Untitled Material"
}

function readProductUnit(options: MaterialItemOption[], productId: string, fallback: string) {
  return options.find((product) => product.id === productId)?.sendUnit || fallback || "-"
}

function MaterialSectionMetric({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <span className="inline-flex items-center gap-1 text-xs text-[var(--foreground)]/72">
      <span className="font-medium text-[var(--foreground)]/55">{label}</span>
      <span>{value}</span>
    </span>
  )
}

function MaterialCardCell({
  label,
  children,
  className,
}: {
  label: string
  children: ReactNode
  className?: string
}) {
  return (
    <div className={joinClasses("min-w-0 rounded-lg border border-[var(--panel-border)] bg-transparent px-3 py-2", className)}>
      <div className="mb-1 text-[10px] uppercase tracking-wide text-[var(--foreground)]/45">{label}</div>
      <div>{children}</div>
    </div>
  )
}

function MaterialActionCell({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) {
  return (
    <div className="flex min-w-0 items-end">
      <MaterialCardCell label={label} className="w-full">
        <div className="flex justify-start">{children}</div>
      </MaterialCardCell>
    </div>
  )
}

function MaterialItemSectionHeader({
  item,
  productOptions,
  isExpanded,
  onToggle,
}: {
  item: WorkOrderMaterialItem
  productOptions: MaterialItemOption[]
  isExpanded: boolean
  onToggle: () => void
}) {
  const unit = readProductUnit(productOptions, item.productId, item.sendUnit)
  const productLabel = readProductLabel(productOptions, item.productId, item.productName)

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={isExpanded}
      aria-label={isExpanded ? `Collapse ${productLabel}` : `Expand ${productLabel}`}
      className="group flex w-full items-center justify-between gap-4 px-4 py-3 text-left transition hover:bg-[var(--panel-hover)]/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40"
    >
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-semibold">{productLabel}</div>
      </div>
      <div className="flex flex-wrap items-center justify-end gap-x-4 gap-y-1 text-xs text-[var(--foreground)]/68">
        <MaterialSectionMetric label="Qty" value={formatQuantitySummary(item.quantity, unit)} />
        <MaterialSectionMetric label="Material" value={formatLineTotal(item)} />
        <MaterialSectionMetric label="Allocated" value={formatCurrencyValue(item.materialExpense)} />
        <MaterialSectionMetric
          label="Status"
          value={item.hasAllocationShortage ? `Short ${item.remainingQuantity.toFixed(2)}` : `${item.allocations.length} Linked`}
        />
      </div>
      <span className="flex h-8 w-8 items-center justify-center rounded-md border border-[var(--panel-border)] text-[var(--foreground)]/70 transition group-hover:bg-[var(--panel-hover)] group-hover:text-[var(--foreground)]">
        {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
      </span>
    </button>
  )
}

function MaterialItemEditorCard({
  item,
  productOptions,
  savingItemId,
  deletingItemId,
  itemErrors = {},
  onItemFieldChange,
  onSaveItem,
  onDeleteItem,
}: {
  item: WorkOrderMaterialItem
  productOptions: MaterialItemOption[]
  savingItemId: string | null
  deletingItemId: string | null
  itemErrors?: RowFieldErrors<MaterialItemField>
  onItemFieldChange: (itemId: string, field: keyof EditableMaterialItem, value: string) => void
  onSaveItem: (item: EditableMaterialItem) => void
  onDeleteItem: (itemId: string) => void
}) {
  const rowErrors = itemErrors[item.id]

  return (
    <div className="grid gap-3 xl:grid-cols-[minmax(15rem,1.6fr)_minmax(10rem,.9fr)_minmax(10rem,.9fr)_minmax(8rem,.8fr)_minmax(16rem,1.3fr)_auto_auto]">
      <MaterialCardCell label="Product">
        <div className="space-y-1">
          <select
            value={item.productId}
            onChange={(event) => onItemFieldChange(item.id, "productId", event.target.value)}
            className={getFieldControlClassName("w-full rounded border border-[var(--panel-border)] bg-transparent px-2 py-1", Boolean(rowErrors?.productId))}
          >
            {productOptions.map((product) => (
              <option key={product.id} value={product.id}>
                {product.label}
              </option>
            ))}
          </select>
          {rowErrors?.productId ? <FieldErrorText>{rowErrors.productId}</FieldErrorText> : null}
        </div>
      </MaterialCardCell>
      <MaterialCardCell label="Qty">
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
      </MaterialCardCell>
      <MaterialCardCell label="Unit Price">
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
      </MaterialCardCell>
      <MaterialCardCell label="Total">
        <LineItemTotalField value={formatLineTotal(item)} className="w-full justify-end" />
      </MaterialCardCell>
      <MaterialCardCell label="Notes">
        <input
          value={item.notes}
          onChange={(event) => onItemFieldChange(item.id, "notes", event.target.value)}
          className="w-full rounded border border-[var(--panel-border)] bg-transparent px-2 py-1"
        />
      </MaterialCardCell>
      <MaterialActionCell label="Save">
        <SaveRowButton onClick={() => onSaveItem(item)} disabled={savingItemId === item.id}>
          {savingItemId === item.id ? "Saving..." : "Save"}
        </SaveRowButton>
      </MaterialActionCell>
      <MaterialActionCell label="Delete">
        <DeleteRowButton onClick={() => onDeleteItem(item.id)} disabled={deletingItemId === item.id}>
          {deletingItemId === item.id ? "Deleting..." : "Delete"}
        </DeleteRowButton>
      </MaterialActionCell>
    </div>
  )
}

function MaterialDraftCard({
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
    <div className={joinClasses("grid gap-3 xl:grid-cols-[minmax(15rem,1.6fr)_minmax(10rem,.9fr)_minmax(10rem,.9fr)_minmax(8rem,.8fr)_minmax(16rem,1.3fr)_auto]", hasFieldErrors(draftErrors) && "bg-rose-500/[0.03]")}>
      <MaterialCardCell label="Product">
        <div className="space-y-1">
          <select
            value={draft.productId}
            onChange={(event) => onDraftChange("productId", event.target.value)}
            className={getFieldControlClassName("w-full rounded border border-[var(--panel-border)] bg-transparent px-2 py-1", Boolean(draftErrors.productId))}
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
      </MaterialCardCell>
      <MaterialCardCell label="Qty">
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
      </MaterialCardCell>
      <MaterialCardCell label="Unit Price">
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
      </MaterialCardCell>
      <MaterialCardCell label="Total">
        <LineItemTotalField value={formatCurrencyValue(calculateLineTotal(draft))} className="w-full justify-end" />
      </MaterialCardCell>
      <MaterialCardCell label="Notes">
        <input
          value={draft.notes}
          onChange={(event) => onDraftChange("notes", event.target.value)}
          className="w-full rounded border border-[var(--panel-border)] bg-transparent px-2 py-1"
        />
      </MaterialCardCell>
      <MaterialActionCell label="Add">
        <button
          type="button"
          onClick={onAdd}
          disabled={adding}
          className="rounded border border-[var(--panel-border)] px-3 py-1 text-sm hover:bg-[var(--panel-hover)] disabled:opacity-60"
        >
          {adding ? "Adding..." : "Add"}
        </button>
      </MaterialActionCell>
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
  onSaveItem: (item: EditableMaterialItem) => void
  onDeleteItem: (itemId: string) => void
  onRequestAutoAllocation: () => void
  isAutoAllocating: boolean
  renderAllocationSection: (item: WorkOrderMaterialItem) => ReactNode
}) {
  const addRow = useInlineCreateRow(false)
  const materialSection = useCollapsibleSection(true)
  const totalMaterialCost = useMemo(() => sumLineTotals(items), [items])
  const totalAllocatedCost = useMemo(
    () => items.reduce((total, item) => total + item.materialExpense, 0),
    [items],
  )

  async function handleAdd() {
    const didAdd = await onAdd()
    if (didAdd !== false) {
      addRow.close()
    }
  }

  return (
    <TableBleed variant="record">
      <section className="overflow-hidden rounded-xl border border-[color:var(--subpanel-border)] bg-[var(--subpanel-background)] shadow-[0_18px_40px_rgba(0,0,0,0.18)]">
        <div className={joinClasses("flex items-stretch gap-3 px-4", materialSection.isOpen && "border-b border-[color:var(--subpanel-border)]")}>
          <button
            type="button"
            onClick={materialSection.toggle}
            aria-expanded={materialSection.isOpen}
            aria-label={materialSection.isOpen ? `Collapse ${title}` : `Expand ${title}`}
            className="group flex min-w-0 flex-1 items-center justify-between gap-4 py-4 text-left transition-all duration-200 hover:bg-[var(--panel-hover)]/55 hover:shadow-[0_0_18px_rgba(59,130,246,0.18)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40"
          >
            <div className="min-w-0 flex-1">
              <div className="text-base font-semibold">{title}</div>
            </div>
            <div className="flex flex-wrap items-center justify-end gap-x-4 gap-y-1">
              <MaterialSectionMetric label="Material Cost" value={formatCurrencyValue(totalMaterialCost)} />
              <MaterialSectionMetric label="Allocated Cost" value={formatCurrencyValue(totalAllocatedCost)} />
            </div>
            <span className="flex h-8 w-8 items-center justify-center rounded-md border border-[var(--panel-border)] text-[var(--foreground)]/70 transition group-hover:bg-[var(--panel-hover)] group-hover:text-[var(--foreground)]">
              {materialSection.isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            </span>
          </button>
          <div className="flex items-center py-4">
            <button
              type="button"
              onClick={onRequestAutoAllocation}
              disabled={isAutoAllocating || items.length === 0}
              className="rounded border border-[var(--panel-border)] px-3 py-1 text-sm hover:bg-[var(--panel-hover)] disabled:opacity-60"
            >
              {isAutoAllocating ? "Auto Allocating..." : "Auto Allocate"}
            </button>
          </div>
        </div>

        {materialSection.isOpen ? (
          <div className="space-y-4 p-4">
            {loading ? (
              <div className="rounded-xl border border-[var(--panel-border)] px-4 py-8 text-center text-[var(--foreground)]/70">
                Loading items...
              </div>
            ) : null}

            {!loading
              ? items.map((item) => {
                  const isExpanded = expandedItemIds.includes(item.id)

                  return (
                    <section key={item.id} className="overflow-hidden rounded-xl border border-[var(--panel-border)] bg-transparent">
                      <MaterialItemSectionHeader
                        item={item}
                        productOptions={productOptions}
                        isExpanded={isExpanded}
                        onToggle={() => onToggleExpandedItem(item.id)}
                      />
                      {isExpanded ? (
                        <div className="space-y-3 border-t border-[var(--panel-border)] bg-transparent p-4">
                          <MaterialItemEditorCard
                            item={item}
                            productOptions={productOptions}
                            savingItemId={savingItemId}
                            deletingItemId={deletingItemId}
                            itemErrors={itemErrors}
                            onItemFieldChange={onItemFieldChange}
                            onSaveItem={onSaveItem}
                            onDeleteItem={onDeleteItem}
                          />
                          {renderAllocationSection(item)}
                        </div>
                      ) : null}
                    </section>
                  )
                })
              : null}

            {!loading && !addRow.isOpen ? (
              <div className="rounded-xl border border-[var(--panel-border)] px-4 py-3">
                <InlineAddRowButton label="Add Material Item" onClick={addRow.open} />
              </div>
            ) : null}

            {!loading && addRow.isOpen ? (
              <div className="rounded-xl border border-[var(--panel-border)] bg-transparent p-4">
                <MaterialDraftCard
                  draft={draft}
                  productOptions={productOptions}
                  adding={adding}
                  draftErrors={draftErrors}
                  onDraftChange={onDraftChange}
                  onAdd={() => void handleAdd()}
                />
              </div>
            ) : null}
          </div>
        ) : null}
      </section>
    </TableBleed>
  )
}
