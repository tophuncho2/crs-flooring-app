"use client"

import { Fragment, type ReactNode, useMemo } from "react"
import { ChevronDown, ChevronRight } from "lucide-react"
import { DeleteRowButton, SaveRowButton } from "@/features/dashboard/shared/table/row-action-buttons"
import { RecordTableHead, RecordTableShell, TableBleed, TableHeaderCell } from "@/features/dashboard/shared/table/table-shell"
import {
  CollapsibleTableSection,
  InlineAddRowButton,
  useInlineCreateRow,
} from "@/features/dashboard/shared/record-view/child-tables/collapsible-table-section"
import {
  calculateLineTotal,
  formatCurrencyValue,
  formatLineTotal,
  sumLineTotals,
} from "@/features/flooring/shared/line-items/line-totals"
import { isEditableDecimalInput, normalizeEditableDecimalInput } from "@/features/flooring/shared/line-items/child-item-validation"
import { MATERIAL_ITEMS_TABLE_MIN_WIDTH_CLASS } from "@/features/flooring/shared/line-items/table-size-classes"
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
    <span className="inline-flex items-center gap-1 text-xs text-[var(--foreground)]/70">
      <span className="font-medium text-[var(--foreground)]/55">{label}</span>
      <span>{value}</span>
    </span>
  )
}

function MaterialItemSectionHeader({
  item,
  productOptions,
  isExpanded,
  onToggle,
  colSpan,
}: {
  item: WorkOrderMaterialItem
  productOptions: MaterialItemOption[]
  isExpanded: boolean
  onToggle: () => void
  colSpan: number
}) {
  const unit = readProductUnit(productOptions, item.productId, item.sendUnit)
  const productLabel = readProductLabel(productOptions, item.productId, item.productName)

  return (
    <tr className="border-t border-[var(--panel-border)] bg-[var(--panel-hover)]/25">
      <td colSpan={colSpan} className="p-0">
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={isExpanded}
          aria-label={isExpanded ? `Collapse ${productLabel}` : `Expand ${productLabel}`}
          className="flex w-full items-center justify-between gap-4 px-4 py-3 text-left transition hover:bg-[var(--panel-hover)]/35"
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
          <span className="flex h-8 w-8 items-center justify-center rounded-md border border-[var(--panel-border)] text-[var(--foreground)]/70">
            {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          </span>
        </button>
      </td>
    </tr>
  )
}

function MaterialItemEditableRow({
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
    <tr className={joinClasses("border-t border-[var(--panel-border)]", hasFieldErrors(rowErrors) && "bg-rose-500/[0.04]")}>
      <td className="px-3 py-2">
        <div className="space-y-1">
          <select
            value={item.productId}
            onChange={(event) => onItemFieldChange(item.id, "productId", event.target.value)}
            className={getFieldControlClassName("w-72 rounded border border-[var(--panel-border)] bg-transparent px-2 py-1", Boolean(rowErrors?.productId))}
          >
            {productOptions.map((product) => (
              <option key={product.id} value={product.id}>
                {product.label}
              </option>
            ))}
          </select>
          {rowErrors?.productId ? <FieldErrorText>{rowErrors.productId}</FieldErrorText> : null}
        </div>
      </td>
      <td className="px-3 py-2">
        <div className="space-y-1">
          <LineItemQuantityField
            className={getFieldControlClassName("", Boolean(rowErrors?.quantity))}
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
      </td>
      <td className="px-3 py-2">
        <LineItemPriceField
          className={getFieldControlClassName("", Boolean(rowErrors?.unitPrice))}
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
      </td>
      <td className="px-3 py-2">
        <LineItemTotalField value={formatLineTotal(item)} />
      </td>
      <td className="px-3 py-2">
        <input
          value={item.notes}
          onChange={(event) => onItemFieldChange(item.id, "notes", event.target.value)}
          className="w-52 rounded border border-[var(--panel-border)] bg-transparent px-2 py-1"
        />
      </td>
      <td className="px-2 py-2">
        <SaveRowButton onClick={() => onSaveItem(item)} disabled={savingItemId === item.id}>
          {savingItemId === item.id ? "Saving..." : "Save"}
        </SaveRowButton>
      </td>
      <td className="px-2 py-2">
        <DeleteRowButton onClick={() => onDeleteItem(item.id)} disabled={deletingItemId === item.id}>
          {deletingItemId === item.id ? "Deleting..." : "Delete"}
        </DeleteRowButton>
      </td>
    </tr>
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
  const colSpan = 7
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
    <CollapsibleTableSection
      title={title}
      titleMeta={
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <MaterialSectionMetric label="Material Cost" value={formatCurrencyValue(totalMaterialCost)} />
          <MaterialSectionMetric label="Allocated Cost" value={formatCurrencyValue(totalAllocatedCost)} />
        </div>
      }
      actions={
        <button
          type="button"
          onClick={onRequestAutoAllocation}
          disabled={isAutoAllocating || items.length === 0}
          className="rounded border border-[var(--panel-border)] px-3 py-1 text-sm hover:bg-[var(--panel-hover)] disabled:opacity-60"
        >
          {isAutoAllocating ? "Auto Allocating..." : "Auto Allocate"}
        </button>
      }
    >
      <TableBleed variant="record">
        <RecordTableShell minWidthClass={MATERIAL_ITEMS_TABLE_MIN_WIDTH_CLASS}>
          <RecordTableHead>
            <tr>
              <TableHeaderCell>Product</TableHeaderCell>
              <TableHeaderCell>Qty</TableHeaderCell>
              <TableHeaderCell>Unit Price</TableHeaderCell>
              <TableHeaderCell>Total</TableHeaderCell>
              <TableHeaderCell>Notes</TableHeaderCell>
              <TableHeaderCell>Save</TableHeaderCell>
              <TableHeaderCell>Delete</TableHeaderCell>
            </tr>
          </RecordTableHead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={colSpan} className="px-3 py-8 text-center text-[var(--foreground)]/70">
                  Loading items...
                </td>
              </tr>
            ) : (
              items.map((item) => {
                const isExpanded = expandedItemIds.includes(item.id)
                return (
                  <Fragment key={item.id}>
                    <MaterialItemSectionHeader
                      item={item}
                      productOptions={productOptions}
                      isExpanded={isExpanded}
                      onToggle={() => onToggleExpandedItem(item.id)}
                      colSpan={colSpan}
                    />
                    {isExpanded ? (
                      <>
                        <MaterialItemEditableRow
                          item={item}
                          productOptions={productOptions}
                          savingItemId={savingItemId}
                          deletingItemId={deletingItemId}
                          itemErrors={itemErrors}
                          onItemFieldChange={onItemFieldChange}
                          onSaveItem={onSaveItem}
                          onDeleteItem={onDeleteItem}
                        />
                        <tr className="border-t border-[var(--panel-border)]">
                          <td colSpan={colSpan} className="p-0">
                            {renderAllocationSection(item)}
                          </td>
                        </tr>
                      </>
                    ) : null}
                  </Fragment>
                )
              })
            )}
            {!loading && !addRow.isOpen ? (
              <tr className="border-t border-[var(--panel-border)]">
                <td colSpan={colSpan} className="px-3 py-3">
                  <InlineAddRowButton label="Add Material Item" onClick={addRow.open} />
                </td>
              </tr>
            ) : null}
            {addRow.isOpen ? (
              <tr className={joinClasses("border-t border-[var(--panel-border)] bg-[var(--panel-hover)]/20", hasFieldErrors(draftErrors) && "bg-rose-500/[0.05]")}>
                <td className="px-3 py-2">
                  <div className="space-y-1">
                    <select
                      value={draft.productId}
                      onChange={(event) => onDraftChange("productId", event.target.value)}
                      className={getFieldControlClassName("w-72 rounded border border-[var(--panel-border)] bg-transparent px-2 py-1", Boolean(draftErrors.productId))}
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
                </td>
                <td className="px-3 py-2">
                  <div className="space-y-1">
                    <LineItemQuantityField
                      className={getFieldControlClassName("", Boolean(draftErrors.quantity))}
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
                </td>
                <td className="px-3 py-2">
                  <LineItemPriceField
                    className={getFieldControlClassName("", Boolean(draftErrors.unitPrice))}
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
                </td>
                <td className="px-3 py-2">
                  <LineItemTotalField value={formatCurrencyValue(calculateLineTotal(draft))} />
                </td>
                <td className="px-3 py-2">
                  <input
                    value={draft.notes}
                    onChange={(event) => onDraftChange("notes", event.target.value)}
                    className="w-52 rounded border border-[var(--panel-border)] bg-transparent px-2 py-1"
                  />
                </td>
                <td className="px-2 py-2" />
                <td className="px-2 py-2">
                  <button
                    type="button"
                    onClick={() => void handleAdd()}
                    disabled={adding}
                    className="rounded border border-[var(--panel-border)] px-3 py-1 text-sm hover:bg-[var(--panel-hover)] disabled:opacity-60"
                  >
                    {adding ? "Adding..." : "Add"}
                  </button>
                </td>
              </tr>
            ) : null}
          </tbody>
        </RecordTableShell>
      </TableBleed>
    </CollapsibleTableSection>
  )
}
