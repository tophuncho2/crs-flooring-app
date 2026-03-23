"use client"

import { DeleteRowButton, SaveRowButton } from "@/features/flooring/shared/ui/table/row-action-buttons"
import { CollapsibleTableSection, InlineAddRowButton, useInlineCreateRow } from "@/features/flooring/shared/ui/table/collapsible-table-section"
import { formatCurrencyValue, formatLineTotal } from "@/features/flooring/shared/domain/line-totals"
import { isEditableDecimalInput, normalizeEditableDecimalInput } from "@/features/flooring/shared/domain/child-item-validation"
import { FieldErrorText, getFieldControlClassName, hasFieldErrors, type FieldErrorMap, type RowFieldErrors } from "./record-field-errors"
import { ModalTableHead, ModalTableShell, TableHeaderCell } from "@/features/flooring/shared/ui/table/table-shell"
import { MATERIAL_ITEMS_TABLE_MIN_WIDTH_CLASS } from "@/features/flooring/shared/ui/table/table-size-classes"

export type MaterialItemOption = {
  id: string
  label: string
  sendUnit: string
}

export type EditableMaterialItem = {
  id: string
  productId: string
  productName: string
  sendUnit: string
  quantity: string
  unitPrice: string
  notes: string
}

export type MaterialItemDraft = {
  productId: string
  quantity: string
  unitPrice: string
  notes: string
}

export type MaterialItemField = "productId" | "quantity" | "unitPrice"
export type MaterialItemFieldErrors = FieldErrorMap<MaterialItemField>

export function validateMaterialItemFields(value: Pick<MaterialItemDraft, "productId" | "quantity" | "unitPrice">) {
  const errors: MaterialItemFieldErrors = {}

  if (!value.productId.trim()) {
    errors.productId = "Select a product."
  }

  if (!value.quantity.trim()) {
    errors.quantity = "Enter a quantity."
  } else if (!isEditableDecimalInput(value.quantity, 2) || !Number.isFinite(Number(value.quantity))) {
    errors.quantity = "Enter a valid quantity with up to 2 decimals."
  } else if (Number(value.quantity) <= 0) {
    errors.quantity = "Enter a quantity greater than 0."
  }

  if (value.unitPrice.trim()) {
    if (!isEditableDecimalInput(value.unitPrice, 2) || !Number.isFinite(Number(value.unitPrice))) {
      errors.unitPrice = "Enter a valid unit price with up to 2 decimals."
    } else if (Number(value.unitPrice) < 0) {
      errors.unitPrice = "Enter a unit price that is 0 or greater."
    }
  }

  return errors
}

export function MaterialItemsEditor({
  title,
  description,
  items,
  draft,
  productOptions,
  loading,
  adding,
  savingItemId,
  deletingItemId,
  draftErrors = {},
  itemErrors = {},
  totalAmount,
  onDraftChange,
  onAdd,
  onItemFieldChange,
  onSaveItem,
  onDeleteItem,
}: {
  title: string
  description: string
  items: EditableMaterialItem[]
  draft: MaterialItemDraft
  productOptions: MaterialItemOption[]
  loading: boolean
  adding: boolean
  savingItemId: string | null
  deletingItemId: string | null
  draftErrors?: MaterialItemFieldErrors
  itemErrors?: RowFieldErrors<MaterialItemField>
  totalAmount?: number
  onDraftChange: (field: keyof MaterialItemDraft, value: string) => void
  onAdd: () => Promise<boolean> | boolean
  onItemFieldChange: (itemId: string, field: keyof EditableMaterialItem, value: string) => void
  onSaveItem?: (item: EditableMaterialItem) => void
  onDeleteItem: (itemId: string) => void
}) {
  const colSpan = onSaveItem ? 8 : 7
  const addRow = useInlineCreateRow(false)

  async function handleAdd() {
    const didAdd = await onAdd()
    if (didAdd !== false) {
      addRow.close()
    }
  }

  return (
    <CollapsibleTableSection
      title={title}
      description={description}
      titleMeta={typeof totalAmount === "number" ? formatCurrencyValue(totalAmount) : undefined}
    >
      <ModalTableShell minWidthClass={MATERIAL_ITEMS_TABLE_MIN_WIDTH_CLASS}>
        <ModalTableHead>
          <tr>
            <TableHeaderCell>Product</TableHeaderCell>
            <TableHeaderCell>Qty</TableHeaderCell>
            <TableHeaderCell>Unit</TableHeaderCell>
            <TableHeaderCell>Unit Price</TableHeaderCell>
            <TableHeaderCell>Total</TableHeaderCell>
            <TableHeaderCell>Notes</TableHeaderCell>
            {onSaveItem ? <TableHeaderCell>Save</TableHeaderCell> : null}
            <TableHeaderCell>Delete</TableHeaderCell>
          </tr>
        </ModalTableHead>
        <tbody>
          {loading ? (
            <tr>
              <td colSpan={colSpan} className="px-3 py-8 text-center text-[var(--foreground)]/70">Loading items...</td>
            </tr>
          ) : (
            items.map((item) => (
              <tr key={item.id} className={`border-t border-[var(--panel-border)] ${hasFieldErrors(itemErrors[item.id]) ? "bg-rose-500/[0.04]" : ""}`}>
                <td className="px-3 py-2">
                  <div className="space-y-1">
                    <select
                      value={item.productId}
                      onChange={(event) => onItemFieldChange(item.id, "productId", event.target.value)}
                      className={getFieldControlClassName("w-72 rounded border border-[var(--panel-border)] bg-transparent px-2 py-1", Boolean(itemErrors[item.id]?.productId))}
                    >
                      {productOptions.map((product) => (
                        <option key={product.id} value={product.id}>{product.label}</option>
                      ))}
                    </select>
                    {itemErrors[item.id]?.productId ? <FieldErrorText>{itemErrors[item.id]?.productId}</FieldErrorText> : null}
                  </div>
                </td>
                <td className="px-3 py-2">
                  <div className="space-y-1">
                    <input
                      value={item.quantity}
                      inputMode="decimal"
                      spellCheck={false}
                      onChange={(event) => onItemFieldChange(item.id, "quantity", normalizeEditableDecimalInput(event.target.value))}
                      className={getFieldControlClassName("w-24 rounded border border-[var(--panel-border)] bg-transparent px-2 py-1", Boolean(itemErrors[item.id]?.quantity))}
                    />
                    {itemErrors[item.id]?.quantity ? <FieldErrorText>{itemErrors[item.id]?.quantity}</FieldErrorText> : null}
                  </div>
                </td>
                <td className="px-3 py-2">{productOptions.find((product) => product.id === item.productId)?.sendUnit || item.sendUnit || "-"}</td>
                <td className="px-3 py-2">
                  <div className={getFieldControlClassName("flex items-center gap-2 rounded border border-[var(--panel-border)] px-2 py-1", Boolean(itemErrors[item.id]?.unitPrice))}>
                    <span className="text-[var(--foreground)]/60">$</span>
                    <input value={item.unitPrice} inputMode="decimal" spellCheck={false} onChange={(event) => onItemFieldChange(item.id, "unitPrice", normalizeEditableDecimalInput(event.target.value))} className="w-20 bg-transparent outline-none" />
                    <span className="text-xs text-[var(--foreground)]/50">/ {productOptions.find((product) => product.id === item.productId)?.sendUnit || item.sendUnit || "unit"}</span>
                  </div>
                  {itemErrors[item.id]?.unitPrice ? <FieldErrorText>{itemErrors[item.id]?.unitPrice}</FieldErrorText> : null}
                </td>
                <td className="px-3 py-2 font-medium">{formatLineTotal(item)}</td>
                <td className="px-3 py-2">
                  <input value={item.notes} onChange={(event) => onItemFieldChange(item.id, "notes", event.target.value)} className="w-56 rounded border border-[var(--panel-border)] bg-transparent px-2 py-1" />
                </td>
                {onSaveItem ? (
                  <td className="px-3 py-2">
                    <SaveRowButton onClick={() => onSaveItem(item)} disabled={savingItemId === item.id}>
                      {savingItemId === item.id ? "Saving..." : "Save"}
                    </SaveRowButton>
                  </td>
                ) : null}
                <td className="px-3 py-2">
                  <DeleteRowButton onClick={() => onDeleteItem(item.id)} disabled={deletingItemId === item.id}>
                    {deletingItemId === item.id ? "Deleting..." : "Delete"}
                  </DeleteRowButton>
                </td>
              </tr>
            ))
          )}
          {!loading && !addRow.isOpen ? (
            <tr className="border-t border-[var(--panel-border)]">
              <td colSpan={colSpan} className="px-3 py-3">
                <InlineAddRowButton label={`Add ${title}`} onClick={addRow.open} />
              </td>
            </tr>
          ) : null}
          {addRow.isOpen ? (
            <tr className={`border-t border-[var(--panel-border)] bg-[var(--panel-hover)]/20 ${hasFieldErrors(draftErrors) ? "bg-rose-500/[0.05]" : ""}`}>
              <td className="px-3 py-2">
                <div className="space-y-1">
                  <select
                    value={draft.productId}
                    onChange={(event) => onDraftChange("productId", event.target.value)}
                    className={getFieldControlClassName("w-72 rounded border border-[var(--panel-border)] bg-transparent px-2 py-1", Boolean(draftErrors.productId))}
                  >
                    <option value="">Select product</option>
                    {productOptions.map((product) => (
                      <option key={product.id} value={product.id}>{product.label}</option>
                    ))}
                  </select>
                  {draftErrors.productId ? <FieldErrorText>{draftErrors.productId}</FieldErrorText> : null}
                </div>
              </td>
              <td className="px-3 py-2">
                <div className="space-y-1">
                  <input
                    value={draft.quantity}
                    inputMode="decimal"
                    spellCheck={false}
                    onChange={(event) => onDraftChange("quantity", normalizeEditableDecimalInput(event.target.value))}
                    className={getFieldControlClassName("w-24 rounded border border-[var(--panel-border)] bg-transparent px-2 py-1", Boolean(draftErrors.quantity))}
                  />
                  {draftErrors.quantity ? <FieldErrorText>{draftErrors.quantity}</FieldErrorText> : null}
                </div>
              </td>
              <td className="px-3 py-2">{productOptions.find((product) => product.id === draft.productId)?.sendUnit || "-"}</td>
              <td className="px-3 py-2">
                <div className={getFieldControlClassName("flex items-center gap-2 rounded border border-[var(--panel-border)] px-2 py-1", Boolean(draftErrors.unitPrice))}>
                  <span className="text-[var(--foreground)]/60">$</span>
                  <input value={draft.unitPrice} inputMode="decimal" spellCheck={false} onChange={(event) => onDraftChange("unitPrice", normalizeEditableDecimalInput(event.target.value))} className="w-20 bg-transparent outline-none" />
                  <span className="text-xs text-[var(--foreground)]/50">/ {productOptions.find((product) => product.id === draft.productId)?.sendUnit || "unit"}</span>
                </div>
                {draftErrors.unitPrice ? <FieldErrorText>{draftErrors.unitPrice}</FieldErrorText> : null}
              </td>
              <td className="px-3 py-2 font-medium">{formatLineTotal(draft)}</td>
              <td className="px-3 py-2">
                <input value={draft.notes} onChange={(event) => onDraftChange("notes", event.target.value)} className="w-56 rounded border border-[var(--panel-border)] bg-transparent px-2 py-1" />
              </td>
              {onSaveItem ? <td className="px-3 py-2" /> : null}
              <td className="px-3 py-2">
                <button type="button" onClick={() => void handleAdd()} disabled={adding} className="rounded border border-[var(--panel-border)] px-3 py-1 text-sm hover:bg-[var(--panel-hover)] disabled:opacity-60">
                  {adding ? "Adding..." : "Add"}
                </button>
              </td>
            </tr>
          ) : null}
        </tbody>
      </ModalTableShell>
    </CollapsibleTableSection>
  )
}
