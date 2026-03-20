"use client"

import { DeleteRowButton, SaveRowButton } from "./row-action-buttons"
import { CollapsibleTableSection, InlineAddRowButton, useInlineCreateRow } from "./collapsible-table-section"
import { formatLineTotal } from "./line-totals"
import { ModalTableHead, ModalTableShell, TableHeaderCell } from "./table-shell"
import { MATERIAL_ITEMS_TABLE_MIN_WIDTH_CLASS } from "./table-size-classes"

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
  onDraftChange: (field: keyof MaterialItemDraft, value: string) => void
  onAdd: () => void
  onItemFieldChange: (itemId: string, field: keyof EditableMaterialItem, value: string) => void
  onSaveItem?: (item: EditableMaterialItem) => void
  onDeleteItem: (itemId: string) => void
}) {
  const colSpan = onSaveItem ? 8 : 7
  const addRow = useInlineCreateRow(false)

  async function handleAdd() {
    await onAdd()
    addRow.close()
  }

  return (
    <CollapsibleTableSection title={title} description={description}>
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
              <tr key={item.id} className="border-t border-[var(--panel-border)]">
                <td className="px-3 py-2">
                  <select value={item.productId} onChange={(event) => onItemFieldChange(item.id, "productId", event.target.value)} className="w-72 rounded border border-[var(--panel-border)] bg-transparent px-2 py-1">
                    {productOptions.map((product) => (
                      <option key={product.id} value={product.id}>{product.label}</option>
                    ))}
                  </select>
                </td>
                <td className="px-3 py-2">
                  <input value={item.quantity} onChange={(event) => onItemFieldChange(item.id, "quantity", event.target.value)} className="w-24 rounded border border-[var(--panel-border)] bg-transparent px-2 py-1" />
                </td>
                <td className="px-3 py-2">{productOptions.find((product) => product.id === item.productId)?.sendUnit || item.sendUnit || "-"}</td>
                <td className="px-3 py-2">
                  <div className="flex items-center gap-2 rounded border border-[var(--panel-border)] px-2 py-1">
                    <span className="text-[var(--foreground)]/60">$</span>
                    <input value={item.unitPrice} onChange={(event) => onItemFieldChange(item.id, "unitPrice", event.target.value)} className="w-20 bg-transparent outline-none" />
                    <span className="text-xs text-[var(--foreground)]/50">/ {productOptions.find((product) => product.id === item.productId)?.sendUnit || item.sendUnit || "unit"}</span>
                  </div>
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
            <tr className="border-t border-[var(--panel-border)] bg-[var(--panel-hover)]/20">
              <td className="px-3 py-2">
                <select value={draft.productId} onChange={(event) => onDraftChange("productId", event.target.value)} className="w-72 rounded border border-[var(--panel-border)] bg-transparent px-2 py-1">
                  <option value="">Select product</option>
                  {productOptions.map((product) => (
                    <option key={product.id} value={product.id}>{product.label}</option>
                  ))}
                </select>
              </td>
              <td className="px-3 py-2">
                <input value={draft.quantity} onChange={(event) => onDraftChange("quantity", event.target.value)} className="w-24 rounded border border-[var(--panel-border)] bg-transparent px-2 py-1" />
              </td>
              <td className="px-3 py-2">{productOptions.find((product) => product.id === draft.productId)?.sendUnit || "-"}</td>
              <td className="px-3 py-2">
                <div className="flex items-center gap-2 rounded border border-[var(--panel-border)] px-2 py-1">
                  <span className="text-[var(--foreground)]/60">$</span>
                  <input value={draft.unitPrice} onChange={(event) => onDraftChange("unitPrice", event.target.value)} className="w-20 bg-transparent outline-none" />
                  <span className="text-xs text-[var(--foreground)]/50">/ {productOptions.find((product) => product.id === draft.productId)?.sendUnit || "unit"}</span>
                </div>
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
