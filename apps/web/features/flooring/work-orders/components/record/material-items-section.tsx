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
import { validateMaterialItemFields } from "@/features/flooring/shared/line-items/material-items-editor"
import { useRowAutosave } from "@/features/flooring/shared/line-items/use-row-autosave"
import { WORK_ORDER_MATERIAL_GRID_CLASS_NAME } from "@/features/flooring/work-orders/components/material-grid-layout"
import type { WorkOrderMaterialItem } from "@/features/flooring/work-orders/types"

function joinClasses(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ")
}

const DARK_SECTION_OUTLINE_CLASS_NAME = "border-[rgba(58,58,58,0.72)]"

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
    <div className="min-w-[8rem] rounded-xl border border-[rgba(58,58,58,0.72)] bg-[var(--panel-background)] px-3 py-2">
      <div className="text-[10px] uppercase tracking-[0.14em] text-[var(--foreground)]/45">{label}</div>
      <div className="mt-1 text-sm font-semibold text-[var(--foreground)]">{value}</div>
    </div>
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
    <div
      className={joinClasses(
        "min-w-0 rounded-xl border border-[rgba(58,58,58,0.72)] bg-[var(--panel-background)] px-3 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]",
        className,
      )}
    >
      <div className="mb-1 text-[10px] font-medium uppercase tracking-[0.14em] text-[var(--foreground)]/45">{label}</div>
      <div>{children}</div>
    </div>
  )
}

function MaterialActionsPanel({
  children,
}: {
  children: ReactNode
}) {
  return (
    <div className="flex min-w-0 items-stretch">
      <MaterialCardCell label="Actions" className="w-full">
        <div className="flex h-full flex-col gap-2">{children}</div>
      </MaterialCardCell>
    </div>
  )
}

function MaterialItemEditorCard({
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
    serialize: (currentItem) => JSON.stringify({
      productId: currentItem.productId,
      quantity: currentItem.quantity,
      unitPrice: currentItem.unitPrice,
      notes: currentItem.notes,
    }),
    canAutosave: Object.keys(validateMaterialItemFields(item)).length === 0,
    onSave: onSaveItem,
  })

  return (
    <div
      {...autosave.focusLeaveProps}
      className={WORK_ORDER_MATERIAL_GRID_CLASS_NAME}
    >
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
      <MaterialActionsPanel>
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
          <SaveRowButton onClick={() => void onSaveItem(item)} disabled={savingItemId === item.id}>
            {savingItemId === item.id ? "Saving..." : "Save"}
          </SaveRowButton>
          <DeleteRowButton onClick={() => onDeleteItem(item.id)} disabled={deletingItemId === item.id}>
            {deletingItemId === item.id ? "Deleting..." : "Delete"}
          </DeleteRowButton>
        </div>
      </MaterialActionsPanel>
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
    <div className={joinClasses(WORK_ORDER_MATERIAL_GRID_CLASS_NAME, hasFieldErrors(draftErrors) && "bg-rose-500/[0.03]")}>
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
      <MaterialActionsPanel>
        <button
          type="button"
          onClick={onAdd}
          disabled={adding}
          className="rounded-md border border-blue-500/25 px-3 py-2 text-sm font-medium hover:bg-[var(--panel-hover)] disabled:opacity-60"
        >
          {adding ? "Adding..." : "Add"}
        </button>
      </MaterialActionsPanel>
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
      <section className="overflow-hidden rounded-2xl border border-[color:var(--subpanel-border)] bg-[var(--subpanel-background)] shadow-[0_18px_40px_rgba(0,0,0,0.16)]">
        <div
          className={joinClasses(
            "relative",
            materialSection.isOpen && "border-b border-[color:var(--subpanel-border)]",
          )}
        >
          <button
            type="button"
            onClick={materialSection.toggle}
            aria-expanded={materialSection.isOpen}
            aria-label={materialSection.isOpen ? `Collapse ${title}` : `Expand ${title}`}
            className="group absolute inset-0 z-0 w-full bg-[rgba(58,58,58,0.72)] text-left transition-all duration-200 hover:bg-[var(--panel-hover)]/55 hover:shadow-[0_0_22px_rgba(59,130,246,0.16)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40"
          />
          <div className="pointer-events-none relative z-[1] flex items-center gap-4 px-5 py-5">
            <div className="flex min-w-0 flex-1 items-center justify-between gap-4 pr-40">
              <div className="min-w-0">
                <div className="inline-flex items-center rounded-lg border border-[var(--panel-border)] bg-[var(--panel-background)] px-3 py-1.5 text-base font-semibold text-[var(--foreground)] shadow-[0_4px_12px_rgba(0,0,0,0.08)]">
                  {title}
                </div>
              </div>
              <div className="flex flex-wrap items-center justify-end gap-2">
                <MaterialSectionMetric
                  label="Items"
                  value={`${items.length} ${items.length === 1 ? "item" : "items"}`}
                />
                <MaterialSectionMetric label="Material Cost" value={formatCurrencyValue(totalMaterialCost)} />
                <MaterialSectionMetric label="Allocated Cost" value={formatCurrencyValue(totalAllocatedCost)} />
              </div>
            </div>
            <div className="pointer-events-auto relative z-[2] ml-auto flex items-center">
              <button
                type="button"
                onClick={onRequestAutoAllocation}
                disabled={isAutoAllocating || items.length === 0}
                className="rounded-lg border border-blue-500/25 bg-[var(--panel-background)] px-3 py-2 text-sm font-medium text-[var(--foreground)] transition hover:bg-[var(--panel-hover)] disabled:opacity-60"
              >
                {isAutoAllocating ? "Auto Allocating..." : "Auto Allocate"}
              </button>
            </div>
          </div>
        </div>

        {materialSection.isOpen ? (
          <div className="space-y-4 p-5">
            {loading ? (
              <div className="rounded-2xl border border-[var(--panel-border)] bg-[var(--panel-background)] px-4 py-8 text-center text-[var(--foreground)]/70">
                Loading items...
              </div>
            ) : null}

            {!loading
              ? items.map((item) => {
                  const isExpanded = expandedItemIds.includes(item.id)

                  return (
                    <section
                      key={item.id}
                      className={joinClasses(
                        "overflow-hidden rounded-2xl border border-[rgba(58,58,58,0.72)] bg-[var(--panel-background)] shadow-[0_8px_18px_rgba(0,0,0,0.08)] transition-shadow",
                        isExpanded && "shadow-[0_12px_24px_rgba(0,0,0,0.1)]",
                      )}
                    >
                      <div className="space-y-3 p-4">
                        <MaterialItemEditorCard
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
                        {isExpanded ? (
                          <div className="pt-1">
                            {renderAllocationSection(item)}
                          </div>
                        ) : null}
                      </div>
                    </section>
                  )
                })
              : null}

            {!loading && !addRow.isOpen ? (
              <div className="rounded-2xl border border-dashed border-[var(--panel-border)] bg-[var(--panel-background)] px-4 py-4">
                <InlineAddRowButton
                  label="Add Material Item"
                  onClick={addRow.open}
                  className={DARK_SECTION_OUTLINE_CLASS_NAME}
                />
              </div>
            ) : null}

            {!loading && addRow.isOpen ? (
              <div className="rounded-2xl border border-[var(--panel-border)] bg-[var(--panel-background)] p-4">
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
